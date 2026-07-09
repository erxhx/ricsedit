import { dbGetAppointmentByToken, dbUpdateAppointment } from '@/lib/db';
import { sendRescheduleNotification } from '@/lib/notifications';
import { validateSlot } from '@/lib/booking-validation';

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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date) || !/^\d{1,2}:\d{2}$/.test(body.startTime)) {
    return Response.json({ error: 'Invalid date or time format.' }, { status: 400 });
  }

  // Re-validate the requested slot server-side (past / working hours /
  // conflicts incl. blocked time) — never trust the client's availability UI.
  // The appointment being moved is excluded from the conflict check.
  const [h, m] = body.startTime.split(':').map(Number);
  const check = await validateSlot({
    staff: apt.staff,
    dateStr: body.date,
    startMin: h * 60 + m,
    durationMinutes: apt.durationMinutes,
    excludeId: apt.id,
  });
  if (!check.ok) {
    return Response.json({ error: check.error }, { status: check.status });
  }

  const endTime = addMinutes(body.startTime, apt.durationMinutes);
  const updated = await dbUpdateAppointment(apt.id, { date: body.date, startTime: body.startTime, endTime });
  if (updated) sendRescheduleNotification(updated).catch(() => {});
  return Response.json({ ok: true, date: body.date, startTime: body.startTime, endTime });
}
