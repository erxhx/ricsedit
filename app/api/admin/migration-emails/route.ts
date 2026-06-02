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

/** GET — preview: returns count of unsent upcoming appointments */
export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [appointments, sentIds] = await Promise.all([
    dbGetUpcomingConfirmedAppointments(todayPacific()),
    getSentIds(),
  ]);

  const unsent = appointments.filter(a => !sentIds.has(a.id));

  return NextResponse.json({
    total: appointments.length,
    unsent: unsent.length,
    alreadySent: sentIds.size,
  });
}

/** POST — send migration emails to all unsent upcoming confirmed appointments */
export async function POST() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [appointments, sentIds] = await Promise.all([
    dbGetUpcomingConfirmedAppointments(todayPacific()),
    getSentIds(),
  ]);

  const unsent = appointments.filter(a => !sentIds.has(a.id));

  let sent = 0;
  const failed: string[] = [];

  for (const apt of unsent) {
    try {
      await sendMigrationNotification(apt);
      sentIds.add(apt.id);
      sent++;
    } catch {
      failed.push(apt.id);
    }
  }

  // Persist sent IDs even if some failed
  if (sent > 0) await saveSentIds(sentIds);

  return NextResponse.json({ sent, failed: failed.length, skipped: sentIds.size - sent });
}
