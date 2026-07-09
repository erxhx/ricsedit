import { dbGetAppointmentByToken, dbUpdateAppointment } from '@/lib/db';
import { sendCancellationNotification } from '@/lib/notifications';
import { withinSelfServeCutoff } from '@/lib/booking-validation';

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
  sendCancellationNotification(apt, 'client').catch(() => {});
  return Response.json({ ok: true });
}
