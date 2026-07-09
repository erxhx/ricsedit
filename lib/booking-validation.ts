/**
 * Server-side slot validation — shared by the public booking-create and
 * self-serve reschedule endpoints. Never trust the client's availability UI:
 * re-check that a requested slot is in the future, inside the staff member's
 * working hours, and free of conflicts.
 */

import { dbGetAppointmentsForDate } from './db';
import { getAvailabilityConfig } from './availability-store';

export type SlotCheck =
  | { ok: true }
  | { ok: false; error: string; status: number };

/** Current Pacific date (YYYY-MM-DD) and minutes since midnight. */
export function pacificNow(): { dateStr: string; minutes: number } {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Vancouver', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Vancouver', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now);
  const h = parseInt(parts.find(p => p.type === 'hour')!.value, 10) % 24;
  const m = parseInt(parts.find(p => p.type === 'minute')!.value, 10);
  return { dateStr, minutes: h * 60 + m };
}

/** Online cancel/reschedule closes this many hours before the appointment. */
export const SELF_SERVE_CUTOFF_HOURS = 3;

/**
 * Minutes from now (Pacific) until an appointment's start. Negative when the
 * appointment has already started.
 */
export function minutesUntilSlot(dateStr: string, startTime: string): number {
  const nowP = pacificNow();
  const [y1, m1, d1] = nowP.dateStr.split('-').map(Number);
  const [y2, m2, d2] = dateStr.split('-').map(Number);
  const dayDiff = Math.round(
    (new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 86_400_000,
  );
  const [h, m] = startTime.split(':').map(Number);
  return dayDiff * 1440 + (h * 60 + (m || 0)) - nowP.minutes;
}

/** True when the appointment is inside the self-serve cutoff window. */
export function withinSelfServeCutoff(dateStr: string, startTime: string): boolean {
  return minutesUntilSlot(dateStr, startTime) < SELF_SERVE_CUTOFF_HOURS * 60;
}

export async function validateSlot({
  staff,
  dateStr,
  startMin,
  durationMinutes,
  excludeId,
}: {
  staff: string;
  dateStr: string;          // YYYY-MM-DD
  startMin: number;         // minutes since midnight
  durationMinutes: number;
  /** Appointment id to ignore in the conflict check (reschedules). */
  excludeId?: string;
}): Promise<SlotCheck> {
  const endMin = startMin + durationMinutes;

  // ── In the past? (Pacific) ────────────────────────────────────────────────
  const nowP = pacificNow();
  if (dateStr < nowP.dateStr || (dateStr === nowP.dateStr && startMin < nowP.minutes)) {
    return { ok: false, status: 400, error: 'That time has already passed. Please choose a later slot.' };
  }

  // ── Inside working hours? ─────────────────────────────────────────────────
  const config = await getAvailabilityConfig();
  const [y, mo, d] = dateStr.split('-').map(Number);
  const dow = new Date(y, mo - 1, d).getDay();
  const hours = config.staff[staff]?.days?.[dow] ?? config.days[dow];
  if (!hours) {
    return { ok: false, status: 400, error: 'We are closed that day. Please choose another date.' };
  }
  let closeMin = hours[1] * 60;
  // Barber-specific rules, mirroring the slot engine: Thursday late close and
  // a 15-minute end-of-day flex so a cut can end just past close.
  if (staff === 'eric' && dow === 4 && config.barberThuClose != null) {
    closeMin = config.barberThuClose * 60;
  }
  const endFlex = staff === 'eric' ? 15 : 0;
  if (startMin < hours[0] * 60 || endMin > closeMin + endFlex) {
    return { ok: false, status: 400, error: 'That time is outside our working hours. Please choose another slot.' };
  }

  // ── Conflicts with existing (non-cancelled) bookings, incl. blocked time ──
  const dayAppts = await dbGetAppointmentsForDate(dateStr);
  const conflict = dayAppts.some((a) => {
    if (a.staff !== staff || a.status === 'cancelled' || a.id === excludeId) return false;
    const [sh, sm] = a.startTime.split(':').map(Number);
    const [eh, em] = a.endTime.split(':').map(Number);
    const aStart = sh * 60 + (sm || 0);
    const aEnd   = eh * 60 + (em || 0);
    return startMin < aEnd && endMin > aStart; // half-open overlap
  });
  if (conflict) {
    return { ok: false, status: 409, error: 'That time slot was just booked by someone else. Please choose a different time.' };
  }

  return { ok: true };
}
