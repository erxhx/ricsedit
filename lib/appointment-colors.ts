// Pure color utilities — safe to import in both server and client components.
//
// Colours now derive from the staff roster (lib/staff.ts), which is the single
// source of truth. These exports are kept for back-compat with existing
// components; new code should prefer importing from lib/staff.ts directly.

import { STAFF_COLORS, serviceCategory, getAppointmentColor as rosterColor } from './staff';

export const SERVICE_COLORS = {
  ericBarber: STAFF_COLORS.ericBarber,
  liviWax:    STAFF_COLORS.liviWax,
  liviTan:    STAFF_COLORS.liviTan,
} as const;

/** Returns the hex accent colour for an appointment block. */
export function getAppointmentColor(staff: string, service: string): string {
  return rosterColor(staff, service);
}

/** Returns whether a Livi service is a spray tan or a wax/brow service. */
export function liviCategory(service: string): 'tan' | 'wax' {
  return serviceCategory(service) === 'tan' ? 'tan' : 'wax';
}
