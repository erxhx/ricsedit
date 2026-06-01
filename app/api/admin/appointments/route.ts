import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { dbCreateAppointment, dbGetAppointmentsForDate, dbGetAppointmentsForRange } from '@/lib/db';
import { sendBookingConfirmation } from '@/lib/notifications';
import type { Appointment } from '@/lib/admin-mock';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date  = searchParams.get('date');
  const start = searchParams.get('start');
  const end   = searchParams.get('end');

  try {
    if (start && end && DATE_RE.test(start) && DATE_RE.test(end)) {
      const apts = await dbGetAppointmentsForRange(start, end);
      return Response.json(apts);
    }
    if (date && DATE_RE.test(date)) {
      const apts = await dbGetAppointmentsForDate(date);
      return Response.json(apts);
    }
    return Response.json({ error: 'Provide ?date= or ?start=&end=' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json() as Omit<Appointment, 'id' | 'manageToken'>;

  if (!body.date || !body.startTime || !body.staff || !body.service || !body.clientName) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const apt = await dbCreateAppointment(body);
    // Send confirmation to the client (fire-and-forget — never fails the response)
    await sendBookingConfirmation(apt).catch(() => {});
    return Response.json(apt, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Failed to create' }, { status: 500 });
  }
}
