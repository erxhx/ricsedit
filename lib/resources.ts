/**
 * Shared resources — physical things only one appointment can use at a time.
 *
 * Staff conflicts are about a *person* being in two places; this is about a
 * *room*. The treatment room is used for both waxing and lashes, so a wax
 * appointment and a lash appointment can't overlap even though Livi and Niamh
 * are different people and neither is double-booked.
 *
 * Resources are defined by service category rather than by staff member,
 * because who performs a service changes more often than where it happens.
 *
 * Persisted to the `settings` table under key 'resources', mirroring
 * availability-store. Falls back to the default below if the row is absent.
 */

import { db } from './supabase';
import { getStaff } from './staff';
import type { ServiceCategory } from './services';

export interface Resource {
  /** Stable id — referenced by nothing else yet, but keys React lists. */
  id: string;
  /** Display name, e.g. "Treatment Room". */
  name: string;
  /** Service categories performed in this resource. */
  categories: ServiceCategory[];
}

/**
 * The studio's three rooms.
 *
 * Only the treatment room actually constrains anything today — it's the one
 * with two categories in it. The other two are listed because a room holding a
 * single category is still true, and it's what makes the model legible: adding
 * a second barber, or moving tan in with the wax, becomes a tick box rather
 * than a code change.
 */
export const DEFAULT_RESOURCES: Resource[] = [
  { id: 'treatment-room', name: 'Treatment Room', categories: ['wax', 'lashes'] },
  { id: 'barber-room',    name: 'Barber Room',    categories: ['barber'] },
  { id: 'tan-room',       name: 'Tan Room',       categories: ['tan'] },
];

declare global {
  // eslint-disable-next-line no-var
  var __resourcesCache: Resource[] | undefined;
}

const KEY = 'resources';

function normalise(raw: unknown): Resource[] {
  if (!Array.isArray(raw)) return structuredClone(DEFAULT_RESOURCES);
  const out: Resource[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const rec = r as Record<string, unknown>;
    const id = typeof rec.id === 'string' ? rec.id : '';
    const name = typeof rec.name === 'string' ? rec.name : '';
    if (!id || !name) continue;
    const cats = Array.isArray(rec.categories)
      ? rec.categories.filter((c): c is ServiceCategory =>
          c === 'barber' || c === 'tan' || c === 'wax' || c === 'lashes')
      : [];
    out.push({ id, name, categories: cats });
  }
  return out;
}

export async function getResources(): Promise<Resource[]> {
  if (global.__resourcesCache) return global.__resourcesCache;
  try {
    const { data, error } = await db
      .from('settings').select('value').eq('key', KEY).single();
    if (!error && data?.value) {
      global.__resourcesCache = normalise(data.value);
      return global.__resourcesCache;
    }
  } catch {
    // Table may not exist yet — use the default.
  }
  global.__resourcesCache = structuredClone(DEFAULT_RESOURCES);
  return global.__resourcesCache;
}

export async function saveResources(resources: Resource[]): Promise<boolean> {
  global.__resourcesCache = resources;
  try {
    const { error } = await db.from('settings').upsert({
      key: KEY,
      value: resources,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

// ── Conflict detection ───────────────────────────────────────────────────────

/** Minimal shape needed from an appointment — keeps this testable and cheap. */
export interface ResourceAppt {
  id: string;
  staff: string;
  service: string;
  startTime: string;   // HH:MM
  endTime: string;     // HH:MM
  status: string;
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * The categories an appointment occupies.
 *
 * Bookings store the service *name*, and a multi-service booking joins them
 * with ' + ' (see the create route), so each part is looked up separately.
 * When nothing resolves — a renamed or deleted service, or a custom label —
 * fall back to every category the staff member performs. That errs toward
 * declaring a conflict, which is the safe direction for a shared room.
 */
export function appointmentCategories(
  appt: { service: string; staff: string },
  categoryByName: Map<string, ServiceCategory>,
): ServiceCategory[] {
  const out = new Set<ServiceCategory>();
  for (const part of String(appt.service ?? '').split('+')) {
    const cat = categoryByName.get(part.trim());
    if (cat) out.add(cat);
  }
  if (out.size === 0) {
    for (const cat of getStaff(appt.staff)?.categories ?? []) out.add(cat);
  }
  return [...out];
}

/** Resources used by any of these categories. */
export function resourcesFor(
  categories: ServiceCategory[],
  resources: Resource[],
): Resource[] {
  return resources.filter(r => r.categories.some(c => categories.includes(c)));
}

/**
 * Finds an existing appointment that holds a shared resource across the
 * requested window, or null when the room is free.
 *
 * Deliberately skipped:
 *  - the same staff member — a person clashing with themselves is already
 *    caught by the per-staff conflict check, with a better error message;
 *  - `blocked` status — a personal block (lunch, an errand) takes that person
 *    off the books but doesn't occupy the room. Closing the room itself is
 *    what "Block all staff" is for, and that writes a block per staff member;
 *  - `cancelled`, which frees everything.
 */
export function findResourceConflict(opts: {
  resources: Resource[];
  dayAppts: ResourceAppt[];
  categoryByName: Map<string, ServiceCategory>;
  /** Who the new booking is for. */
  staff: string;
  /** Categories the new booking occupies. */
  categories: ServiceCategory[];
  startMin: number;
  endMin: number;
  excludeId?: string;
}): { resource: Resource; appt: ResourceAppt } | null {
  const wanted = resourcesFor(opts.categories, opts.resources);
  if (wanted.length === 0) return null;

  for (const appt of opts.dayAppts) {
    if (appt.id === opts.excludeId) continue;
    if (appt.staff === opts.staff) continue;
    if (appt.status === 'cancelled' || appt.status === 'blocked') continue;

    const start = toMin(appt.startTime);
    const end   = toMin(appt.endTime);
    if (!(opts.startMin < end && opts.endMin > start)) continue; // half-open overlap

    const theirs = appointmentCategories(appt, opts.categoryByName);
    const shared = wanted.find(r =>
      r.categories.some(c => theirs.includes(c)));
    if (shared) return { resource: shared, appt };
  }
  return null;
}
