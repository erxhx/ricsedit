import { db } from './supabase';
import type { Service, ServiceGroup } from './services';
import { BARBER_SERVICES, TAN_SERVICES, TAN_ADDONS, WAX_GROUPS } from './services';

export interface ServicesData {
  barberServices: Service[];
  tanServices: Service[];
  tanAddons: Service[];
  waxGroups: ServiceGroup[];
}

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
  }));
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
      if (m1 || m2) saveServicesStore().catch(() => {});
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
  ];
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
  | { kind: 'wax'; groupName: string };

export function addServiceToStore(service: Service, target: AddTarget): void {
  const store = getServicesStore();
  if (target.kind === 'barber')   store.barberServices.push(service);
  else if (target.kind === 'tan') store.tanServices.push(service);
  else if (target.kind === 'tanAddon') store.tanAddons.push(service);
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
  store.waxGroups      = store.waxGroups.map((g) => ({
    ...g,
    services: g.services.filter((s) => { if (s.id === id) { found = true; return false; } return true; }),
  }));
  return found;
}
