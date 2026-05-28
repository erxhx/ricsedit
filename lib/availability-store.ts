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

export interface AvailabilityConfig {
  /** Keyed 0 (Sun) … 6 (Sat). */
  days: Record<number, DayHours>;
  /** Special late-night close hour for barber on Thursday (day 4). */
  barberThuClose: number;
}

export const DEFAULT_AVAILABILITY: AvailabilityConfig = {
  days: {
    0: [10, 18],
    1: null,
    2: null,
    3: [10, 18],
    4: [10, 18],
    5: [10, 18],
    6: [10, 18],
  },
  barberThuClose: 21,
};

declare global {
  // eslint-disable-next-line no-var
  var __availabilityCache: AvailabilityConfig | undefined;
}

function normalise(raw: unknown): AvailabilityConfig {
  if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_AVAILABILITY);
  const r = raw as Record<string, unknown>;
  const rawDays = (r.days ?? {}) as Record<string, unknown>;
  const days: Record<number, DayHours> = {};
  for (let d = 0; d <= 6; d++) {
    const v = rawDays[String(d)] ?? rawDays[d];
    days[d] = Array.isArray(v) && v.length === 2
      ? [Number(v[0]), Number(v[1])]
      : null;
  }
  return {
    days,
    barberThuClose:
      typeof r.barberThuClose === 'number'
        ? r.barberThuClose
        : DEFAULT_AVAILABILITY.barberThuClose,
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
    // Table doesn't exist — changes live in memory until restart.
    return false;
  }
}
