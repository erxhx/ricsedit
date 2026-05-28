import type { Service, ServiceGroup } from './services';
import { BARBER_SERVICES, TAN_SERVICES, TAN_ADDONS, WAX_GROUPS } from './services';

export interface ServicesData {
  barberServices: Service[];
  tanServices: Service[];
  tanAddons: Service[];
  waxGroups: ServiceGroup[];
}

declare global {
  var __servicesStore: ServicesData | undefined;
}

function seed(): ServicesData {
  // Deep clone so edits don't mutate the original module constants
  return JSON.parse(JSON.stringify({
    barberServices: BARBER_SERVICES,
    tanServices: TAN_SERVICES,
    tanAddons: TAN_ADDONS,
    waxGroups: WAX_GROUPS,
  }));
}

export function getServicesStore(): ServicesData {
  if (!global.__servicesStore) global.__servicesStore = seed();
  return global.__servicesStore;
}

/** Flat list of all services across all categories */
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
