// Pure color utilities — safe to import in both server and client components.

export const SERVICE_COLORS = {
  ericBarber: '#7db83e',  // lime green  — Eric's barbering
  liviWax:    '#b07590',  // pink        — Livi's waxing & brow services
  liviTan:    '#b5824a',  // orange/tan  — Livi's sunless tan services
} as const;

// All of Livi's sunless tan service names — must match services.ts exactly
const LIVI_TAN_SERVICES = new Set([
  'Classic Full Body',
  'Rapid Full Body',
  'Face Tan',
]);

/** Returns the hex accent colour for an appointment block. */
export function getAppointmentColor(staff: string, service: string): string {
  if (staff === 'eric') return SERVICE_COLORS.ericBarber;
  if (staff === 'livi') {
    return LIVI_TAN_SERVICES.has(service) ? SERVICE_COLORS.liviTan : SERVICE_COLORS.liviWax;
  }
  return '#ece9e2';
}

/** Returns whether a Livi service is a spray tan or a wax/brow service. */
export function liviCategory(service: string): 'tan' | 'wax' {
  return LIVI_TAN_SERVICES.has(service) ? 'tan' : 'wax';
}
