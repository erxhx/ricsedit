/**
 * Availability config — studio weekly schedule.
 *
 * Persisted to a `settings` table in Supabase (key = 'availability').
 * Falls back to in-memory defaults if the table doesn't exist yet.
 *
 * To enable persistence, run this SQL once in your Supabase dashboard:
 *   CREATE TABLE settings (
 *     key        text primary key,
 *     value      jsonb not null,
 *     updated_at timestamptz default now()
 *   );
 */

import { db } from './supabase';

/** [openHour, closeHour] in 24-hour integers, or null = closed that day. */
export type DayHours = [number, number] | null;

/** Working days/hours for one staff member. */
export interface StaffSchedule {
  days: Record<number, DayHours>; // 0 (Sun) … 6 (Sat)
}

export interface AvailabilityConfig {
  /** General store hours — drives the Open/Closed indicator on the live site. */
  days: Record<number, DayHours>;
  /** Special late-night close hour for barber on Thursday (day 4). */
  barberThuClose: number;
  /** Per-staff working schedules — drives which dates/slots are bookable. */
  staff: {
    eric: StaffSchedule;
    livi: StaffSchedule;
  };
}

const DEFAULT_DAYS: Record<number, DayHours> = {
  0: [10, 18],
  1: null,
  2: null,
  3: [10, 18],
  4: [10, 18],
  5: [10, 18],
  6: [10, 18],
};

export const DEFAULT_AVAILABILITY: AvailabilityConfig = {
  days: { ...DEFAULT_DAYS },
  barberThuClose: 21,
  staff: {
    eric: { days: { ...DEFAULT_DAYS } },
    livi: { days: { ...DEFAULT_DAYS } },
  },
};

declare global {
  // eslint-disable-next-line no-var
  var __availabilityCache: AvailabilityConfig | undefined;
}

function normaliseDays(raw: unknown): Record<number, DayHours> {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const days: Record<number, DayHours> = {};
  for (let d = 0; d <= 6; d++) {
    const v = src[String(d)] ?? src[d];
    days[d] = Array.isArray(v) && v.length === 2
      ? [Number(v[0]), Number(v[1])]
      : null;
  }
  return days;
}

function normalise(raw: unknown): AvailabilityConfig {
  if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_AVAILABILITY);
  const r = raw as Record<string, unknown>;

  const days = normaliseDays(r.days);

  // Staff — fall back to store hours if staff block is missing (old config format)
  const rawStaff = (r.staff ?? {}) as Record<string, unknown>;
  const ericRaw  = (rawStaff.eric ?? {}) as Record<string, unknown>;
  const liviRaw  = (rawStaff.livi ?? {}) as Record<string, unknown>;

  return {
    days,
    barberThuClose:
      typeof r.barberThuClose === 'number'
        ? r.barberThuClose
        : DEFAULT_AVAILABILITY.barberThuClose,
    staff: {
      eric: { days: Object.keys(ericRaw.days ?? {}).length ? normaliseDays(ericRaw.days) : { ...days } },
      livi: { days: Object.keys(liviRaw.days ?? {}).length ? normaliseDays(liviRaw.days) : { ...days } },
    },
  };
}

export async function getAvailabilityConfig(): Promise<AvailabilityConfig> {
  if (global.__availabilityCache) return global.__availabilityCache;
  try {
    const { data, error } = await db
      .from('settings')
      .select('value')
      .eq('key', 'availability')
      .single();
    if (!error && data?.value) {
      global.__availabilityCache = normalise(data.value);
      return global.__availabilityCache;
    }
  } catch {
    // Table may not exist yet — use defaults.
  }
  global.__availabilityCache = structuredClone(DEFAULT_AVAILABILITY);
  return global.__availabilityCache;
}

export async function saveAvailabilityConfig(config: AvailabilityConfig): Promise<boolean> {
  global.__availabilityCache = config;
  try {
    const { error } = await db.from('settings').upsert({
      key: 'availability',
      value: config,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}
