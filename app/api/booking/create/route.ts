/**
 * Public booking endpoint — called by the static editstudio.space site.
 * No auth required. Accepts the booking payload from booking.jsx and
 * writes the appointment to Supabase.
 */

import { NextRequest } from 'next/server';
import { dbCreateAppointment } from '@/lib/db';
import { sendBookingConfirmation } from '@/lib/notifications';

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

// ── In-memory login attempts (first line of defence — resets on cold start) ───
// For booking spam a honeypot + validation is the primary defence here.
// Full rate limiting would require Redis/KV.

interface BookingService { id: string; name: string; price: number; duration: number; }

interface BookingPayload {
  category: 'barber' | 'tan' | 'wax';
  services: BookingService[];
  addons?: BookingService[];
  date: string;
  time: { h: number; m: number };
  client: { firstName: string; lastName: string; email: string; phone: string; notes?: string };
  _hp?: string; // honeypot — must be empty
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as BookingPayload & { intakeResponses?: Record<string, unknown> };
    const { category, services, addons, date, time, client, intakeResponses } = body;

    // ── Honeypot check — bots fill this, humans don't ─────────────────────────
    if (body._hp) {
      // Return a convincing success to confuse bots
      return Response.json({ ok: true }, { headers: CORS });
    }

    // ── Basic structural validation ───────────────────────────────────────────
    if (!category || !['barber', 'tan', 'wax'].includes(category))
      return Response.json({ error: 'Invalid category' }, { status: 400, headers: CORS });
    if (!services?.length || services.length > 10)
      return Response.json({ error: 'Invalid services' }, { status: 400, headers: CORS });
    if (!date || !time)
      return Response.json({ error: 'Missing date or time' }, { status: 400, headers: CORS });

    // ── Client field validation ───────────────────────────────────────────────
    const clientError = validateClient(client ?? {});
    if (clientError)
      return Response.json({ error: clientError }, { status: 400, headers: CORS });

    // ── Build appointment ─────────────────────────────────────────────────────
    const staff = category === 'barber' ? 'eric' : 'livi';
    const dateStr = new Date(date).toISOString().slice(0, 10);
    const startTime = `${pad(time.h)}:${pad(time.m ?? 0)}`;

    const allServices = [...services, ...(addons ?? [])];
    const serviceName = allServices.map(s => s.name.slice(0, 100)).join(' + ').slice(0, 200);
    const totalDuration = allServices.reduce((s, x) => s + (x.duration || 0), 0) || 30;
    const totalPrice    = allServices.reduce((s, x) => s + (x.price    || 0), 0);
    const endTime       = addMinutes(startTime, totalDuration);
    const clientName    = `${client.firstName.trim()} ${client.lastName.trim()}`.trim();

    const apt = await dbCreateAppointment({
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

    await sendBookingConfirmation(apt).catch(() => {});

    return Response.json(
      { ok: true, id: apt.id, manageToken: apt.manageToken },
      { headers: CORS },
    );
  } catch (e) {
    console.error('[booking/create]', e);
    return Response.json(
      { error: e instanceof Error ? e.message : 'Booking failed' },
      { status: 500, headers: CORS },
    );
  }
}
