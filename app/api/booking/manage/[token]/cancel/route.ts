import { dbGetAppointmentByToken, dbUpdateAppointment } from '@/lib/db';

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
  // TODO: trigger cancellation email/SMS
  return Response.json({ ok: true });
}
