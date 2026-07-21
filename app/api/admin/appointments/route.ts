import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { dbCreateAppointment, dbGetAppointmentsForDate, dbGetAppointmentsForRange } from '@/lib/db';
import { sendBookingConfirmation } from '@/lib/notifications';
import { getStaffPermissions, canViewAllRevenue, redactRevenue } from '@/lib/staff-permissions';
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
    // Redact other staff's revenue for viewers who can't see studio-wide numbers.
    const perms = await getStaffPermissions();
    const canSeeAll = canViewAllRevenue(session.sub, session.role, perms);
    const redact = (apts: Appointment[]) => redactRevenue(apts, session.sub, canSeeAll);

    if (start && end && DATE_RE.test(start) && DATE_RE.test(end)) {
      return Response.json(redact(await dbGetAppointmentsForRange(start, end)));
    }
    if (date && DATE_RE.test(date)) {
      return Response.json(redact(await dbGetAppointmentsForDate(date)));
    }
    return Response.json({ error: 'Provide ?date= or ?start=&end=' }, { status: 400 });
  } catch (e) {
    console.error('[admin/appointments GET]', e);
    return Response.json({ error: 'Failed to load appointments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json() as Omit<Appointment, 'id' | 'manageToken'>;

  const isBlock = body.status === 'blocked';
  if (!body.date || !body.startTime || !body.staff || !body.service || (!isBlock && !body.clientName)) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const apt = await dbCreateAppointment(body);
    // Send confirmation to the client (fire-and-forget — skip for blocks)
    if (!isBlock) await sendBookingConfirmation(apt).catch(() => {});
    return Response.json(apt, { status: 201 });
  } catch (e) {
    console.error('[admin/appointments POST]', e);
    return Response.json({ error: 'Failed to create appointment' }, { status: 500 });
  }
}
