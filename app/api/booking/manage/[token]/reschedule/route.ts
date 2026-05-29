import { dbGetAppointmentByToken, dbUpdateAppointment } from '@/lib/db';
import { sendRescheduleNotification } from '@/lib/notifications';

function addMinutes(t: string, mins: number): string {
  const [h, m] = t.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const apt = await dbGetAppointmentByToken(token);

  if (!apt) return Response.json({ error: 'Not found' }, { status: 404 });
  if (apt.status !== 'confirmed') {
    return Response.json({ error: 'Appointment cannot be rescheduled' }, { status: 400 });
  }

  const body = await req.json() as { date: string; startTime: string };
  if (!body.date || !body.startTime) {
    return Response.json({ error: 'date and startTime are required' }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (body.date < today) {
    return Response.json({ error: 'Cannot reschedule to a past date' }, { status: 400 });
  }

  const endTime = addMinutes(body.startTime, apt.durationMinutes);
  const updated = await dbUpdateAppointment(apt.id, { date: body.date, startTime: body.startTime, endTime });
  if (updated) sendRescheduleNotification(updated).catch(() => {});
  return Response.json({ ok: true, date: body.date, startTime: body.startTime, endTime });
}
