/**
 * Public booking endpoint — called by the static editstudio.space site.
 * No auth required. Accepts the booking payload from booking.jsx and
 * writes the appointment to Supabase.
 */

import { NextRequest } from 'next/server';
import { dbCreateAppointment } from '@/lib/db';
import { db } from '@/lib/supabase';
import { validateSlot } from '@/lib/booking-validation';
import { sendPushToStaff, fmtWhen } from '@/lib/push';
import { getPaymentSettings, amountDueCents, prepayAmountCents, clampTipCents } from '@/lib/payment-settings';
import { taxBreakdownCents } from '@/lib/tax';
import {
  squareConfigured, findOrCreateCustomer, chargeDeposit, storeCardOnFile, refundPayment,
} from '@/lib/square';
import type { PaymentRecord } from '@/lib/square';
import { sendBookingConfirmation } from '@/lib/notifications';
import { staffForCategory } from '@/lib/staff';
import { getServicesStoreAsync, getAllServices } from '@/lib/services-store';
import type { ServiceCategory } from '@/lib/services';

const CATEGORIES: ServiceCategory[] = ['barber', 'tan', 'wax', 'lashes'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

function pad(n: number) { return String(n).padStart(2, '0'); }

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

// ── Input validation ──────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const PHONE_DIGITS_RE = /^\d{7,15}$/;

function validateClient(client: {
  firstName: string; lastName: string; email: string; phone: string; notes?: string;
}): string | null {
  if (!client.firstName?.trim() || client.firstName.length > 80)
    return 'Invalid first name';
  if (!client.lastName?.trim() || client.lastName.length > 80)
    return 'Invalid last name';
  if (!client.email?.trim() || !EMAIL_RE.test(client.email.trim()))
    return 'Invalid email address';
  const digits = client.phone?.replace(/\D/g, '') ?? '';
  if (!PHONE_DIGITS_RE.test(digits))
    return 'Invalid phone number';
  if ((client.notes?.length ?? 0) > 1000)
    return 'Notes too long';
  return null;
}

// ── In-memory rate limiter ────────────────────────────────────────────────────
// Resets on Vercel cold starts but covers burst bot attacks within a warm instance.
// Thresholds are generous for real clients (who book once every few weeks)
// but block any automated script hammering the endpoint.

const BOOKING_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_PER_IP        = 10;              // max 10 bookings per IP per 10 min (covers group bookings)
const MAX_PER_EMAIL     = 5;              // max 5 bookings per email per hour
const EMAIL_WINDOW_MS   = 60 * 60 * 1000; // 1 hour

const ipMap    = new Map<string, { count: number; resetAt: number }>();
const emailMap = new Map<string, { count: number; resetAt: number }>();

function checkLimit(
  map: Map<string, { count: number; resetAt: number }>,
  key: string, max: number, windowMs: number,
): boolean {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || entry.resetAt < now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }
  if (entry.count >= max) return false; // blocked
  entry.count++;
  return true;
}

function pruneMap(map: Map<string, { count: number; resetAt: number }>) {
  if (map.size > 1000) {
    const now = Date.now();
    for (const [k, v] of map) if (v.resetAt < now) map.delete(k);
  }
}

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';
}

interface BookingService { id: string; name: string; price: number; duration: number; }

interface BookingPayload {
  category: ServiceCategory;
  services: BookingService[];
  addons?: BookingService[];
  date: string;
  time: { h: number; m: number };
  client: { firstName: string; lastName: string; email: string; phone: string; notes?: string };
  /** Present when the category's payment policy requires it, or when the
   * client opts into an optional prepayment. */
  payment?: {
    token: string;              // Web Payments SDK card/Apple Pay token
    verificationToken?: string; // buyer verification (SCA)
    idempotencyKey: string;     // unique per booking attempt — retry-safe
    prepay?: boolean;           // client opted into optional full prepayment
    tipCents?: number;          // tip on top of the charge (prepay only)
  };
  _hp?: string; // honeypot — must be empty
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as BookingPayload & { intakeResponses?: Record<string, unknown> };
    const { category, services, addons, date, time, client, intakeResponses } = body;

    // ── Honeypot check — bots fill this, humans don't ─────────────────────────
    if (body._hp) {
      return Response.json({ ok: true }, { headers: CORS }); // silent discard
    }

    // ── Rate limiting ─────────────────────────────────────────────────────────
    const ip = getIp(req);
    pruneMap(ipMap); pruneMap(emailMap);

    if (!checkLimit(ipMap, ip, MAX_PER_IP, BOOKING_WINDOW_MS)) {
      return Response.json(
        { error: 'Too many bookings — please try again shortly or call us at 778 535 3348.' },
        { status: 429, headers: CORS },
      );
    }

    // Email rate limit checked after validation so we have the email value
    // (done below after validateClient)

    // ── Basic structural validation ───────────────────────────────────────────
    if (!category || !CATEGORIES.includes(category))
      return Response.json({ error: 'Invalid category' }, { status: 400, headers: CORS });
    if (!services?.length || services.length > 10)
      return Response.json({ error: 'Invalid services' }, { status: 400, headers: CORS });
    if (!date || !time)
      return Response.json({ error: 'Missing date or time' }, { status: 400, headers: CORS });

    // ── Client field validation ───────────────────────────────────────────────
    const clientError = validateClient(client ?? {});
    if (clientError)
      return Response.json({ error: clientError }, { status: 400, headers: CORS });

    // Per-email rate limit (after validation so email is confirmed valid)
    if (!checkLimit(emailMap, client.email.trim().toLowerCase(), MAX_PER_EMAIL, EMAIL_WINDOW_MS)) {
      return Response.json(
        { error: 'Too many bookings from this email — please call us at 778 535 3348.' },
        { status: 429, headers: CORS },
      );
    }

    // ── Build appointment ─────────────────────────────────────────────────────
    const staff = staffForCategory(category) ?? 'eric';
    // Prefer a plain YYYY-MM-DD from the client (its local calendar date). Fall
    // back to parsing an ISO string for older cached clients — but never via
    // toISOString(), which would shift the day for non-Pacific visitors.
    const dateStr = /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : new Date(date).toISOString().slice(0, 10);
    const startTime = `${pad(time.h)}:${pad(time.m ?? 0)}`;

    // ── Authoritative pricing/duration ────────────────────────────────────────
    // Never trust the client's price/duration/name. Resolve each selected item
    // by id against the current services catalogue; fall back to the submitted
    // values only for ids not in the catalogue (defensive — public flow only
    // offers catalogue services).
    await getServicesStoreAsync();
    const catalogue = new Map(getAllServices().map((s) => [s.id, s]));
    const resolve = (item: BookingService) => {
      const svc = catalogue.get(item.id);
      return svc
        ? { id: svc.id, name: svc.name, price: svc.price, duration: svc.durationMinutes, isProduct: svc.isProduct }
        : { id: item.id, name: String(item.name ?? '').slice(0, 100), price: Number(item.price) || 0, duration: Number(item.duration) || 0, isProduct: false };
    };
    const resolved = [...services, ...(addons ?? [])].map(resolve);

    const serviceName   = resolved.map((s) => s.name.slice(0, 100)).join(' + ').slice(0, 200);
    const totalDuration = resolved.reduce((s, x) => s + (x.duration || 0), 0) || 30;
    const totalPrice    = resolved.reduce((s, x) => s + (x.price    || 0), 0);
    const endTime       = addMinutes(startTime, totalDuration);
    const clientName    = `${client.firstName.trim()} ${client.lastName.trim()}`.trim();

    // ── Slot re-validation (never trust the client's availability UI) ──────────
    // Shared with the self-serve reschedule endpoint: past-slot guard,
    // working-hours check, and conflict check (including blocked time).
    const check = await validateSlot({
      staff,
      dateStr,
      startMin: (time.h ?? 0) * 60 + (time.m ?? 0),
      durationMinutes: totalDuration,
    });
    if (!check.ok) {
      return Response.json({ error: check.error }, { status: check.status, headers: CORS });
    }

    // ── Payment (per-category policy: deposit/prepay and/or card on file) ─────
    // Order matters: slot validated BEFORE charging; charge BEFORE creating the
    // appointment; refund if anything after the charge fails.
    let paymentRecord: PaymentRecord | null = null;
    const policy = (await getPaymentSettings())[category];
    const configured = squareConfigured();
    const mustStore  = policy.cardOnFile;                 // card required on file
    const mustCharge = policy.mode !== 'off';             // deposit/prepay required
    // Optional full prepay the client chose to take (never trust as required).
    const wantsPrepay = configured && policy.allowPrepay && body.payment?.prepay === true;
    // A token is only required when we must charge, must store, or the client
    // opted to prepay. Barber "pay later" sends no token and books for free.
    const requiresToken = configured && (mustCharge || mustStore || wantsPrepay);

    if (requiresToken && (!body.payment?.token || !body.payment.idempotencyKey)) {
      return Response.json(
        { error: 'This booking requires payment details. Please refresh the page and try again.' },
        { status: 402, headers: CORS },
      );
    }

    if (configured && body.payment?.token && body.payment.idempotencyKey) {
      // Base charge (pre-tax): a required deposit/prepay, else the full price
      // if the client opted to prepay, else nothing (store-card-only or free).
      const baseCents = mustCharge ? amountDueCents(policy, totalPrice)
                      : wantsPrepay ? prepayAmountCents(totalPrice)
                      : 0;
      const isFullPrepay = policy.mode === 'prepay' || wantsPrepay;
      // Tax only on a full prepayment (GST on services, GST+PST on products);
      // deposits are partial holds — the POS taxes the full bill at settlement.
      const tax = isFullPrepay && baseCents > 0
        ? taxBreakdownCents(resolved)
        : { gstCents: 0, pstCents: 0, taxCents: 0 };
      // Tips apply only to a FULL prepayment (required 'prepay' or opted-in),
      // never to a partial deposit. Tip percentages are on the taxed total
      // (matching the in-person POS), so the clamp base includes tax.
      const tipCents = isFullPrepay && baseCents > 0
        ? clampTipCents(body.payment.tipCents, baseCents + tax.taxCents) : 0;

      try {
        const customerId = await findOrCreateCustomer(clientName, client.email.trim(), client.phone.trim());

        if (baseCents > 0) {
          paymentRecord = await chargeDeposit({
            sourceId: body.payment.token,
            verificationToken: body.payment.verificationToken,
            amountCents: baseCents + tax.taxCents,
            tipCents,
            note: `${serviceName} — ${dateStr} ${startTime} (${clientName})`,
            customerId,
            idempotencyKey: body.payment.idempotencyKey,
          });
          paymentRecord.prepaid = isFullPrepay;
          if (tax.taxCents > 0) {
            paymentRecord.gstCents = tax.gstCents;
            paymentRecord.pstCents = tax.pstCents || undefined;
          }
        }

        if (mustStore) {
          try {
            const stored = await storeCardOnFile({
              // After a charge, save from the payment id (one tokenization does
              // both); store-only flows use the raw token + verification.
              sourceId: paymentRecord ? paymentRecord.paymentId : body.payment.token,
              verificationToken: paymentRecord ? undefined : body.payment.verificationToken,
              customerId,
              idempotencyKey: `card-${body.payment.idempotencyKey}`,
            });
            paymentRecord = {
              ...(paymentRecord ?? { paymentId: '', amountCents: 0, currency: 'CAD', status: 'CARD_ON_FILE' }),
              customerId, cardId: stored.cardId,
              cardBrand: paymentRecord?.cardBrand ?? stored.brand,
              last4: paymentRecord?.last4 ?? stored.last4,
            };
          } catch (cardErr) {
            // Card-on-file is part of the policy contract: unwind and reject.
            console.error('[booking/create] card-on-file failed', cardErr);
            if (paymentRecord?.paymentId) {
              await refundPayment(paymentRecord.paymentId, paymentRecord.amountCents, 'Booking failed — card could not be saved');
            }
            return Response.json(
              { error: 'We couldn’t save your card. Please check the details and try again.' },
              { status: 402, headers: CORS },
            );
          }
        }
      } catch (payErr) {
        console.error('[booking/create] payment failed', payErr);
        return Response.json(
          { error: 'Your payment didn’t go through. Please check your card details and try again.' },
          { status: 402, headers: CORS },
        );
      }
    }

    let apt;
    try {
      apt = await dbCreateAppointment({
        date: dateStr, startTime, endTime, staff,
        clientName,
        clientEmail: client.email.trim(),
        clientPhone: client.phone.trim(),
        service: serviceName,
        durationMinutes: totalDuration,
        price: totalPrice,
        status: 'confirmed',
        notes: client.notes?.trim().slice(0, 1000) || undefined,
        intakeResponses: intakeResponses && Object.keys(intakeResponses).length
          ? { category, fields: intakeResponses }
          : undefined,
      });
    } catch (createErr) {
      // Money was taken but the slot fell through (e.g. unique-index race):
      // give it back before surfacing the error.
      if (paymentRecord?.paymentId) {
        await refundPayment(paymentRecord.paymentId, paymentRecord.amountCents, 'Booking failed — slot unavailable');
      }
      throw createErr;
    }

    // Attach the payment record to the appointment row. Best-effort: if the
    // `payment` column hasn't been added in Supabase yet, the booking still
    // stands and the money is visible in the Square dashboard.
    if (paymentRecord) {
      // supabase-js reports failures via the returned error, not by throwing
      const { error: payPersistErr } = await db.from('appointments')
        .update({ payment: paymentRecord }).eq('id', apt.id);
      if (payPersistErr) {
        console.error('[booking/create] could not persist payment record (missing column?)', payPersistErr.message);
      }
    }

    await sendBookingConfirmation(apt).catch(() => {});

    // Buzz the assigned staff member's devices (fire-and-forget)
    sendPushToStaff(staff, {
      title: `New booking — ${clientName}`,
      body: `${serviceName} · ${fmtWhen(dateStr, startTime)}`,
      url: `/admin/appointments/${apt.id}`,
      tag: `apt-${apt.id}`,
    }).catch(() => {});

    return Response.json(
      { ok: true, id: apt.id, manageToken: apt.manageToken },
      { headers: CORS },
    );
  } catch (e) {
    console.error('[booking/create]', e);

    // PostgreSQL unique constraint violation (23505) = slot was just taken
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('23505') || msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate')) {
      return Response.json(
        { error: 'That time slot was just booked by someone else. Please go back and choose a different time.' },
        { status: 409, headers: CORS },
      );
    }

    return Response.json(
      { error: e instanceof Error ? e.message : 'Booking failed' },
      { status: 500, headers: CORS },
    );
  }
}
