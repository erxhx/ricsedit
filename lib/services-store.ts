import { db } from './supabase';
import type { Service, ServiceGroup, ServiceCategory } from './services';
import { BARBER_SERVICES, TAN_SERVICES, TAN_ADDONS, WAX_GROUPS, LASH_SERVICES } from './services';

export interface ServicesData {
  barberServices: Service[];
  tanServices: Service[];
  tanAddons: Service[];
  waxGroups: ServiceGroup[];
  lashServices: Service[];
  /** Bumped when the seeded lash menu changes so persisted stores re-adopt it. */
  lashMenuVersion?: number;
}

// Bump this when LASH_SERVICES changes and you want existing stores to re-seed it.
const LASH_MENU_VERSION = 2;

declare global {
  // eslint-disable-next-line no-var
  var __servicesStore: ServicesData | undefined;
}

function seed(): ServicesData {
  return JSON.parse(JSON.stringify({
    barberServices: BARBER_SERVICES,
    tanServices:    TAN_SERVICES,
    tanAddons:      TAN_ADDONS,
    waxGroups:      WAX_GROUPS,
    lashServices:   LASH_SERVICES,
  }));
}

/** Ensures persisted stores adopt the current seeded lash menu. */
function applyCategoryMigration(store: ServicesData): boolean {
  const missing     = !Array.isArray(store.lashServices);
  // Original auto-seeded placeholder menu, identified by an id the real menu lacks.
  const placeholder = !missing && store.lashServices.some((s) => s.id === 'lash-fill-2wk');
  // Persisted seed predates the current LASH_MENU_VERSION (e.g. duration fixes).
  // A store with a lash list but no version field is treated as version 1.
  const stale       = !missing && (store.lashMenuVersion ?? 1) < LASH_MENU_VERSION;

  if (missing || placeholder || stale) {
    store.lashServices    = JSON.parse(JSON.stringify(LASH_SERVICES));
    store.lashMenuVersion = LASH_MENU_VERSION;
    return true;
  }
  return false;
}

/** Synchronous read — returns in-memory store or seeds from static defaults. */
export function getServicesStore(): ServicesData {
  if (!global.__servicesStore) global.__servicesStore = seed();
  return global.__servicesStore;
}

/**
 * Ensures all tan and wax services (non-addon) have requiresWaiver: true.
 * Runs on load to migrate any stale persisted data.
 */
function applyWaiverMigration(store: ServicesData): boolean {
  let changed = false;
  for (const svc of store.tanServices) {
    if (!svc.requiresWaiver) { svc.requiresWaiver = true; changed = true; }
  }
  for (const group of store.waxGroups) {
    for (const svc of group.services) {
      if (!svc.requiresWaiver) { svc.requiresWaiver = true; changed = true; }
    }
  }
  return changed;
}

/**
 * Patches known barber service durations that were updated, and splits the
 * combined Kids + Senior Cut into two separate services.
 */
function applyDurationMigration(store: ServicesData): boolean {
  let changed = false;

  // Duration patches keyed by service id
  const patches: Record<string, number> = {
    'beard-trim':              30,
    'freshen-up-haircut':      45,
    'freshen-up-haircut-beard': 60,
  };

  for (const svc of store.barberServices) {
    if (patches[svc.id] !== undefined && svc.durationMinutes !== patches[svc.id]) {
      svc.durationMinutes = patches[svc.id];
      changed = true;
    }
  }

  // Split kids-senior-cut → kids-cut + senior-cut
  const combinedIdx = store.barberServices.findIndex((s) => s.id === 'kids-senior-cut');
  if (combinedIdx !== -1) {
    const replacement: Service[] = [
      {
        id: 'kids-cut', name: 'Kids Cut', category: 'barber',
        durationMinutes: 45, price: 30, description: 'Ages 10 and under.',
        requiresWaiver: false,
      },
      {
        id: 'senior-cut', name: 'Senior Cut', category: 'barber',
        durationMinutes: 45, price: 30, description: 'Ages 65+.',
        requiresWaiver: false,
      },
    ];
    store.barberServices.splice(combinedIdx, 1, ...replacement);
    changed = true;
  }

  return changed;
}

/**
 * July 2026 menu reconciliation against the Square catalog (source of truth):
 * the wax menu's $15 Brow Tint never matched a real service — the studio
 * sells "Brow wax and tint" at $35. Tummy Trail ($5) joins the Body group.
 * The lash menu's $75 Brow Tint is a different service and stays.
 */
function applyMenuMigrationJul2026(store: ServicesData): boolean {
  let changed = false;
  for (const group of store.waxGroups) {
    const tintIdx = group.services.findIndex((s) => s.id === 'brow-tint');
    if (tintIdx !== -1) {
      group.services.splice(tintIdx, 1, {
        id: 'brow-wax-tint', name: 'Brow Wax and Tint', category: 'wax',
        durationMinutes: 30, price: 35, description: 'Shape and define in one visit.',
        requiresWaiver: true,
      });
      changed = true;
    }
    if (group.name === 'Body' && !group.services.some((s) => s.id === 'tummy-trail')) {
      const stomachIdx = group.services.findIndex((s) => s.id === 'stomach');
      group.services.splice(stomachIdx === -1 ? group.services.length : stomachIdx + 1, 0, {
        id: 'tummy-trail', name: 'Tummy Trail', category: 'wax',
        durationMinutes: 10, price: 5, description: 'Quick add-on.',
        requiresWaiver: true,
      });
      changed = true;
    }
  }
  return changed;
}

/**
 * Async read — checks Supabase first so persisted edits survive server restarts.
 * Falls back to static defaults if the settings table doesn't exist yet.
 */
export async function getServicesStoreAsync(): Promise<ServicesData> {
  if (global.__servicesStore) return global.__servicesStore;
  try {
    const { data, error } = await db
      .from('settings')
      .select('value')
      .eq('key', 'services')
      .single();
    if (!error && data?.value) {
      global.__servicesStore = data.value as ServicesData;
      const m1 = applyWaiverMigration(global.__servicesStore);
      const m2 = applyDurationMigration(global.__servicesStore);
      const m3 = applyCategoryMigration(global.__servicesStore);
      const m4 = applyMenuMigrationJul2026(global.__servicesStore);
      if (m1 || m2 || m3 || m4) saveServicesStore().catch(() => {});
      return global.__servicesStore;
    }
  } catch {
    // Table may not exist yet.
  }
  global.__servicesStore = seed();
  return global.__servicesStore;
}

/** Persists the current in-memory store to Supabase. Returns true if saved. */
export async function saveServicesStore(): Promise<boolean> {
  const store = getServicesStore();
  try {
    const { error } = await db.from('settings').upsert({
      key:        'services',
      value:      store,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

/** Flat list of all services across all categories. */
export function getAllServices(): Service[] {
  const s = getServicesStore();
  return [
    ...s.barberServices,
    ...s.tanServices,
    ...s.tanAddons,
    ...s.waxGroups.flatMap((g) => g.services),
    ...s.lashServices,
  ];
}

/** Bookable (non-addon) services for a single category. */
export function servicesByCategory(cat: ServiceCategory, data: ServicesData): Service[] {
  switch (cat) {
    case 'barber': return data.barberServices;
    case 'tan':    return data.tanServices;
    case 'wax':    return data.waxGroups.flatMap((g) => g.services);
    case 'lashes': return data.lashServices ?? [];
    default:       return [];
  }
}

/** Bookable services for a set of categories, in category order. */
export function servicesForCategories(cats: ServiceCategory[], data: ServicesData): Service[] {
  return cats.flatMap((c) => servicesByCategory(c, data));
}

export function updateService(
  id: string,
  patch: Partial<Pick<Service, 'name' | 'price' | 'durationMinutes' | 'description' | 'requiresWaiver'>>,
): Service | null {
  const svc = getAllServices().find((s) => s.id === id);
  if (!svc) return null;
  Object.assign(svc, patch);
  return { ...svc };
}

export type AddTarget =
  | { kind: 'barber' }
  | { kind: 'tan' }
  | { kind: 'tanAddon' }
  | { kind: 'lashes' }
  | { kind: 'wax'; groupName: string };

export function addServiceToStore(service: Service, target: AddTarget): void {
  const store = getServicesStore();
  if (target.kind === 'barber')   store.barberServices.push(service);
  else if (target.kind === 'tan') store.tanServices.push(service);
  else if (target.kind === 'tanAddon') store.tanAddons.push(service);
  else if (target.kind === 'lashes') store.lashServices.push(service);
  else {
    const group = store.waxGroups.find((g) => g.name === target.groupName);
    if (group) group.services.push(service);
  }
}

export function removeServiceFromStore(id: string): boolean {
  const store = getServicesStore();
  let found = false;
  store.barberServices = store.barberServices.filter((s) => { if (s.id === id) { found = true; return false; } return true; });
  store.tanServices    = store.tanServices.filter((s)    => { if (s.id === id) { found = true; return false; } return true; });
  store.tanAddons      = store.tanAddons.filter((s)      => { if (s.id === id) { found = true; return false; } return true; });
  store.lashServices   = store.lashServices.filter((s)   => { if (s.id === id) { found = true; return false; } return true; });
  store.waxGroups      = store.waxGroups.map((g) => ({
    ...g,
    services: g.services.filter((s) => { if (s.id === id) { found = true; return false; } return true; }),
  }));
  return found;
}
