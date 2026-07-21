/**
 * 24-hour appointment reminder cron job.
 *
 * Called by Vercel Cron once daily (see vercel.json).
 * Protected by CRON_SECRET so it can't be triggered by arbitrary HTTP requests.
 *
 * Queries for confirmed appointments tomorrow that haven't been reminded yet,
 * sends each client an email + SMS reminder, then marks reminder_sent = true.
 *
 * SQL migration required (run once in Supabase SQL Editor):
 *   ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent boolean NOT NULL DEFAULT false;
 */

import { NextRequest } from 'next/server';
import { dbGetAppointmentsNeedingReminder, dbMarkReminderSent } from '@/lib/db';
import { sendReminderNotification } from '@/lib/notifications';

function tomorrowPacific(): string {
  // Get tomorrow's date in Pacific time so reminders fire on the studio's local day
  const now = new Date();
  const pac = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Vancouver',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  // Advance by one day
  const [y, m, d] = pac.split('-').map(Number);
  const tomorrow = new Date(y, m - 1, d + 1);
  return tomorrow.getFullYear() + '-' +
    String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' +
    String(tomorrow.getDate()).padStart(2, '0');
}

export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron (or an authorised caller).
  // Fail closed: if CRON_SECRET isn't configured, refuse rather than run
  // open — this endpoint sends emails/SMS and must never be publicly triggerable.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('[cron/reminders] CRON_SECRET is not set — refusing to run');
    return Response.json({ error: 'Not configured' }, { status: 503 });
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const date = tomorrowPacific();
  const appointments = await dbGetAppointmentsNeedingReminder(date);

  let sent = 0;
  for (const apt of appointments) {
    try {
      await sendReminderNotification(apt);
      await dbMarkReminderSent(apt.id);
      sent++;
    } catch (err) {
      console.error(`[cron/reminders] failed for appointment ${apt.id}`, err);
    }
  }

  return Response.json({ ok: true, date, sent, total: appointments.length });
}
