import { dbGetAppointmentByToken, dbUpdateAppointment } from '@/lib/db';
import { sendCancellationNotification } from '@/lib/notifications';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const apt = await dbGetAppointmentByToken(token);

  if (!apt) return Response.json({ error: 'Not found' }, { status: 404 });
  if (apt.status !== 'confirmed') {
    return Response.json({ error: 'Appointment cannot be cancelled' }, { status: 400 });
  }

  await dbUpdateAppointment(apt.id, { status: 'cancelled' });
  sendCancellationNotification(apt, 'client').catch(() => {});
  return Response.json({ ok: true });
}
