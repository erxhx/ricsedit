/**
 * POST — charge a no-show fee to the appointment's card on file.
 *
 * Guards: requires auth, a stored card, no prior no-show charge, and a sane
 * amount. Idempotency key is derived from the appointment id, so even a
 * double-submit can only ever produce one charge at Square.
 */

import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { dbGetAppointmentById } from '@/lib/db';
import { db } from '@/lib/supabase';
import { squareConfigured, chargeDeposit, createItemizedOrder } from '@/lib/square';
import { sendNoShowFeeNotification } from '@/lib/notifications';

const MIN_CENTS = 100;      // $1
const MAX_CENTS = 50000;    // $500 — sanity cap

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (!squareConfigured()) {
    return Response.json({ error: 'Square is not configured.' }, { status: 400 });
  }

  const { id } = await params;
  const { amountCents, notify = true } = await request.json().catch(() => ({})) as
    { amountCents?: number; notify?: boolean };

  if (!amountCents || !Number.isInteger(amountCents) || amountCents < MIN_CENTS || amountCents > MAX_CENTS) {
    return Response.json({ error: 'Enter an amount between $1 and $500.' }, { status: 400 });
  }

  const apt = await dbGetAppointmentById(id);
  if (!apt) return Response.json({ error: 'Not found' }, { status: 404 });
  if (!apt.payment?.cardId || !apt.payment.customerId) {
    return Response.json({ error: 'No card on file for this appointment.' }, { status: 400 });
  }
  if (apt.payment.noShowCharge?.paymentId) {
    return Response.json({ error: 'A no-show fee was already charged for this appointment.' }, { status: 409 });
  }
  if (apt.payment.prepaid && !apt.payment.refunded) {
    return Response.json({ error: 'This client prepaid in full — the payment already stands as the no-show penalty.' }, { status: 409 });
  }

  try {
    // Itemized order (best-effort) so the fee is labeled in Square reports.
    let orderId: string | undefined;
    try {
      const order = await createItemizedOrder({
        lines: [{ name: `No-show fee — ${apt.service}`.slice(0, 120), amountCents }],
        applyTaxes: false,
        customerId: apt.payment.customerId,
        note: apt.date,
        idempotencyKey: `noshow-order-${apt.id}`,
      });
      orderId = order.orderId;
    } catch (orderErr) {
      console.error('[charge] order creation failed, charging without order', orderErr);
    }

    const charged = await chargeDeposit({
      sourceId: apt.payment.cardId,   // card on file — merchant-initiated
      customerId: apt.payment.customerId,
      amountCents,
      note: `No-show fee — ${apt.service} ${apt.date} (${apt.clientName})`,
      idempotencyKey: `noshow-${apt.id}`,
      orderId,
    });

    const noShowCharge = {
      paymentId: charged.paymentId,
      amountCents,
      status: charged.status,
      at: new Date().toISOString(),
    };
    const { error: persistErr } = await db.from('appointments')
      .update({ payment: { ...apt.payment, noShowCharge } }).eq('id', apt.id);
    if (persistErr) console.error('[charge] persist failed', persistErr.message);

    if (notify) {
      sendNoShowFeeNotification(apt, amountCents, apt.payment.last4).catch(() => {});
    }

    return Response.json({ ok: true, noShowCharge });
  } catch (err) {
    console.error('[charge] no-show fee failed', err);
    return Response.json(
      { error: 'The charge was declined or failed. The card may no longer be valid.' },
      { status: 402 },
    );
  }
}
