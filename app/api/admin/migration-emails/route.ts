import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { dbGetUpcomingConfirmedAppointments } from '@/lib/db';
import { sendMigrationNotification } from '@/lib/notifications';
import { db } from '@/lib/supabase';

const SETTINGS_KEY = 'migration_sent_ids';

async function auth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

async function getSentIds(): Promise<Set<string>> {
  try {
    const { data } = await db
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();
    const ids = data?.value;
    if (Array.isArray(ids)) return new Set(ids as string[]);
  } catch { /* fall through */ }
  return new Set();
}

async function saveSentIds(ids: Set<string>): Promise<void> {
  await db.from('settings').upsert({
    key: SETTINGS_KEY,
    value: Array.from(ids),
    updated_at: new Date().toISOString(),
  });
}

function todayPacific(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Vancouver',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

/** GET — returns full appointment list with sent status for each */
export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [appointments, sentIds] = await Promise.all([
    dbGetUpcomingConfirmedAppointments(todayPacific()),
    getSentIds(),
  ]);

  const rows = appointments.map(a => ({
    id:          a.id,
    clientName:  a.clientName,
    clientEmail: a.clientEmail,
    service:     a.service,
    date:        a.date,
    startTime:   a.startTime,
    staff:       a.staff,
    sent:        sentIds.has(a.id),
  }));

  return NextResponse.json({
    appointments: rows,
    total:       rows.length,
    unsent:      rows.filter(r => !r.sent).length,
    alreadySent: rows.filter(r =>  r.sent).length,
  });
}

/** POST — send migration emails.
 *  Body: {} → send all unsent
 *  Body: { id: string, force: true } → resend a single appointment regardless of sent status
 */
export async function POST(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { id?: string; force?: boolean };

  // ── Single resend ──────────────────────────────────────────────────────────
  if (body.id) {
    const appointments = await dbGetUpcomingConfirmedAppointments(todayPacific());
    // Also check all confirmed (not just future) in case the test apt is today
    const apt = appointments.find(a => a.id === body.id);
    if (!apt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });

    try {
      await sendMigrationNotification(apt);
      // Mark as sent if not already
      const sentIds = await getSentIds();
      sentIds.add(apt.id);
      await saveSentIds(sentIds);
      return NextResponse.json({ sent: 1, failed: 0 });
    } catch {
      return NextResponse.json({ sent: 0, failed: 1 });
    }
  }

  // ── Bulk send (all unsent) ─────────────────────────────────────────────────
  const [appointments, sentIds] = await Promise.all([
    dbGetUpcomingConfirmedAppointments(todayPacific()),
    getSentIds(),
  ]);

  const targets = body.force
    ? appointments                                  // force=true → resend everyone
    : appointments.filter(a => !sentIds.has(a.id)); // default → unsent only

  let sent = 0;
  const failed: string[] = [];

  for (const apt of targets) {
    try {
      await sendMigrationNotification(apt);
      sentIds.add(apt.id);
      sent++;
    } catch {
      failed.push(apt.id);
    }
  }

  if (sent > 0) await saveSentIds(sentIds);

  return NextResponse.json({ sent, failed: failed.length, skipped: appointments.length - targets.length });
}
