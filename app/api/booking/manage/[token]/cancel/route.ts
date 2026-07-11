import { dbGetAppointmentByToken, dbUpdateAppointment } from '@/lib/db';
import { sendCancellationNotification } from '@/lib/notifications';
import { withinSelfServeCutoff } from '@/lib/booking-validation';
import { sendPushToStaff, fmtWhen } from '@/lib/push';
import { refundPayment } from '@/lib/square';
import { db } from '@/lib/supabase';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const apt = await dbGetAppointmentByToken(token);

  if (!apt) return Response.json({ error: 'This link has expired or is no longer valid. Please call or text us at 778 535 3348.' }, { status: 404 });
  if (apt.status === 'cancelled') {
    return Response.json({ error: 'This appointment has already been cancelled.' }, { status: 400 });
  }
  if (apt.status !== 'confirmed') {
    return Response.json({ error: 'This appointment can no longer be cancelled online. Please call or text us at 778 535 3348.' }, { status: 400 });
  }

  // Online cancellation closes 3 hours before the appointment.
  if (withinSelfServeCutoff(apt.date, apt.startTime)) {
    return Response.json({ error: 'Your appointment starts soon, so online cancellation is closed. Please call or text us at 778 535 3348 and we’ll sort it out.' }, { status: 400 });
  }

  await dbUpdateAppointment(apt.id, { status: 'cancelled' });

  // Deposit paid? Cancelling outside the cutoff refunds it automatically.
  let refunded = false;
  if (apt.payment?.paymentId && apt.payment.amountCents > 0 && !apt.payment.refunded) {
    refunded = await refundPayment(apt.payment.paymentId, apt.payment.amountCents, 'Client cancelled online');
    if (refunded) {
      db.from('appointments')
        .update({ payment: { ...apt.payment, refunded: true } })
        .eq('id', apt.id)
        .then(() => {}, () => {});
    }
  }

  sendCancellationNotification(apt, 'client').catch(() => {});
  sendPushToStaff(apt.staff, {
    title: `Cancelled — ${apt.clientName}`,
    body: `${apt.service} · ${fmtWhen(apt.date, apt.startTime)}`,
    url: `/admin/appointments/${apt.id}`,
    tag: `apt-${apt.id}`,
  }).catch(() => {});
  return Response.json({ ok: true, refunded });
}
