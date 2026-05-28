import { getAppointmentByToken, updateAppointment } from '@/lib/admin-mock';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const apt = getAppointmentByToken(token);

  if (!apt) return Response.json({ error: 'Not found' }, { status: 404 });
  if (apt.status !== 'confirmed') {
    return Response.json({ error: 'Appointment cannot be cancelled' }, { status: 400 });
  }

  updateAppointment(apt.id, { status: 'cancelled' });
  // TODO: trigger cancellation email/SMS when Supabase is connected
  return Response.json({ ok: true });
}
