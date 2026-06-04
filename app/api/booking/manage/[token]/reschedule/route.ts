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

  if (!apt) return Response.json({ error: 'This link has expired or is no longer valid. Please call or text us at 778 535 3348.' }, { status: 404 });
  if (apt.status === 'cancelled') {
    return Response.json({ error: 'This appointment has already been cancelled.' }, { status: 400 });
  }
  if (apt.status !== 'confirmed') {
    return Response.json({ error: 'This appointment can no longer be rescheduled online. Please call or text us at 778 535 3348.' }, { status: 400 });
  }

  const body = await req.json() as { date: string; startTime: string };
  if (!body.date || !body.startTime) {
    return Response.json({ error: 'Please select a date and time.' }, { status: 400 });
  }

  const todayPacific = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Vancouver',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  if (body.date < todayPacific) {
    return Response.json({ error: 'Please choose a future date.' }, { status: 400 });
  }

  const endTime = addMinutes(body.startTime, apt.durationMinutes);
  const updated = await dbUpdateAppointment(apt.id, { date: body.date, startTime: body.startTime, endTime });
  if (updated) sendRescheduleNotification(updated).catch(() => {});
  return Response.json({ ok: true, date: body.date, startTime: body.startTime, endTime });
}
