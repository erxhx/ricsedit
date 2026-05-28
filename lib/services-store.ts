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
  patch: Partial<Pick<Service, 'name' | 'price' | 'durationMinutes' | 'description'>>,
): Service | null {
  const svc = getAllServices().find((s) => s.id === id);
  if (!svc) return null;
  Object.assign(svc, patch);
  return { ...svc };
}
