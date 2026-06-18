/**
 * Staff roster — the single source of truth for who works at the studio.
 *
 * Everything that used to hardcode "eric" / "livi" (colors, display names,
 * which service categories a person performs, login, per-staff permissions)
 * now derives from this list. Adding a new staff member is a matter of adding
 * one entry here (plus their ADMIN_PASSWORD_<ID> env var for login).
 *
 * Per-staff *schedules* still live in the availability config (settings table),
 * keyed by the ids defined here.
 */

import type { ServiceCategory } from './services';
import {
  BARBER_SERVICES, TAN_SERVICES, TAN_ADDONS, WAX_GROUPS,
} from './services';

export type StaffRole = 'owner' | 'esti';

export interface StaffMember {
  /** Stable id — used in the DB `staff` column, env vars, and schedule keys. */
  id: string;
  /** Display name shown in the UI and client notifications. */
  name: string;
  /** Login access level. Owners can manage settings & other staff. */
  role: StaffRole;
  /** Primary accent colour — staff dot, legend, and default appointment colour. */
  color: string;
  /** Which service categories this person performs. Drives booking & filtering. */
  categories: ServiceCategory[];
  /**
   * Optional per-category colour overrides. Lets one person's services be
   * colour-coded by type (e.g. Livi's wax vs. tan). Falls back to `color`.
   */
  categoryColors?: Partial<Record<ServiceCategory, string>>;
  /**
   * Permission: can this person see studio-wide revenue (everyone's numbers)?
   * When false they only see their own. Owner-configurable in Settings;
   * the value here is the default. (Owners always effectively see all.)
   */
  canSeeAllRevenue: boolean;
}

// ── Canonical colours ───────────────────────────────────────────────────────────
export const STAFF_COLORS = {
  ericBarber: '#7db83e', // lime green  — Eric's barbering
  liviWax:    '#b07590', // pink        — Livi's waxing & brow services
  liviTan:    '#b5824a', // orange/tan  — Livi's sunless tan services
  niamhLash:  '#7a6cc4', // indigo      — Niamh's lash services
} as const;

// ── The roster ──────────────────────────────────────────────────────────────────
export const STAFF: StaffMember[] = [
  {
    id: 'eric',
    name: 'Eric',
    role: 'owner',
    color: STAFF_COLORS.ericBarber,
    categories: ['barber'],
    canSeeAllRevenue: true,
  },
  {
    id: 'livi',
    name: 'Livi',
    role: 'esti',
    color: STAFF_COLORS.liviWax,
    categories: ['wax', 'tan'],
    categoryColors: { wax: STAFF_COLORS.liviWax, tan: STAFF_COLORS.liviTan },
    canSeeAllRevenue: true,
  },
  {
    id: 'niamh',
    name: 'Niamh',
    role: 'esti',
    color: STAFF_COLORS.niamhLash,
    categories: ['lashes'],
    canSeeAllRevenue: false,
    // Login: set ADMIN_PASSWORD_NIAMH in the environment to enable her sign-in.
  },
];

// ── Lookups ──────────────────────────────────────────────────────────────────────
export const STAFF_IDS = STAFF.map(s => s.id);
const STAFF_BY_ID = new Map(STAFF.map(s => [s.id, s]));

export function getStaff(id: string): StaffMember | undefined {
  return STAFF_BY_ID.get(id);
}

/** Display name for a staff id; falls back to the raw id if unknown. */
export function staffName(id: string): string {
  return STAFF_BY_ID.get(id)?.name ?? id;
}

/** Primary accent colour for a staff id (used for dots, legends, etc.). */
export function staffColor(id: string): string {
  return STAFF_BY_ID.get(id)?.color ?? '#ece9e2';
}

// ── Service name → category ──────────────────────────────────────────────────────
// Appointments store the service *name* (e.g. "Classic Full Body"), so we build a
// name → category lookup from the static service catalogue. Used to colour an
// appointment by the staff member's per-category override.
const CATEGORY_BY_SERVICE_NAME = new Map<string, ServiceCategory>();
for (const svc of [...BARBER_SERVICES, ...TAN_SERVICES, ...TAN_ADDONS]) {
  CATEGORY_BY_SERVICE_NAME.set(svc.name, svc.category);
}
for (const group of WAX_GROUPS) {
  for (const svc of group.services) CATEGORY_BY_SERVICE_NAME.set(svc.name, svc.category);
}

/** Resolve a service name to its category, if known. */
export function serviceCategory(serviceName: string): ServiceCategory | undefined {
  return CATEGORY_BY_SERVICE_NAME.get(serviceName);
}

/**
 * The accent colour for a specific appointment — a staff member's per-category
 * override if they have one for this service, otherwise their primary colour.
 */
export function getAppointmentColor(staffId: string, serviceName: string): string {
  const member = STAFF_BY_ID.get(staffId);
  if (!member) return '#ece9e2';
  const cat = serviceCategory(serviceName);
  if (cat && member.categoryColors?.[cat]) return member.categoryColors[cat]!;
  return member.color;
}
