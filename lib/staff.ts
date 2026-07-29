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
  BARBER_SERVICES, TAN_SERVICES, TAN_ADDONS, WAX_GROUPS, LASH_SERVICES, LASH_ADDONS,
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
  /**
   * Share of the service price this person is paid, 0–1. Tips are paid out in
   * full on top of it, so 0.5 means "half the service, all the tip".
   *
   * Only affects what a *restricted* viewer sees. Anyone with
   * `canSeeAllRevenue` is looking at the studio's gross takings, where a
   * personal payout rate has no meaning — so the value set for an admin is
   * inert, not a claim about how they're paid.
   *
   * This is the default; the owner can change it per person in Settings.
   */
  commissionRate: number;
  /**
   * Full administrative access: store hours, every staff member's schedule,
   * the whole service menu, every intake form, and Settings.
   *
   * Non-admins are scoped to themselves — their own working schedule, and only
   * the service menu and intake forms for the categories they perform.
   *
   * New staff must be promoted deliberately: anyone added to this roster
   * without `admin: true` is restricted.
   */
  admin: boolean;
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
    commissionRate: 1,
    admin: true,
  },
  {
    id: 'livi',
    name: 'Livi',
    role: 'esti',
    color: STAFF_COLORS.liviWax,
    categories: ['wax', 'tan'],
    categoryColors: { wax: STAFF_COLORS.liviWax, tan: STAFF_COLORS.liviTan },
    canSeeAllRevenue: true,
    commissionRate: 1,
    admin: true,
  },
  {
    id: 'niamh',
    name: 'Niamh',
    role: 'esti',
    color: STAFF_COLORS.niamhLash,
    categories: ['lashes'],
    canSeeAllRevenue: false,
    commissionRate: 0.5,   // half the service, plus all of her tips
    admin: false,
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

// ── Access control ───────────────────────────────────────────────────────────
//
// Every check below resolves against the ROSTER, keyed by staff id — never
// against the `role` claim carried in the session JWT. Sessions last 90 days,
// so a token minted before a permission change still carries the old claim;
// the roster is the live source of truth and a stale cookie can't outvote it.
//
// These are pure predicates. They decide what a person MAY do; they don't
// enforce anything on their own. Every API route that mutates a scoped
// resource has to call them itself — hiding a control in the UI is a courtesy,
// not a boundary.

/** All service categories that exist, in menu order. */
export const ALL_CATEGORIES: ServiceCategory[] = ['barber', 'tan', 'wax', 'lashes'];

/** Full administrative access. Unknown ids are treated as restricted. */
export function isAdmin(staffId: string | null | undefined): boolean {
  return staffId ? STAFF_BY_ID.get(staffId)?.admin === true : false;
}

/**
 * Which service categories this person may view and edit — the menu sections
 * and intake forms they own. Admins get everything; everyone else gets only
 * the categories they actually perform. Unknown ids get nothing.
 */
export function allowedCategories(staffId: string | null | undefined): ServiceCategory[] {
  if (isAdmin(staffId)) return [...ALL_CATEGORIES];
  const member = staffId ? STAFF_BY_ID.get(staffId) : undefined;
  return member ? [...member.categories] : [];
}

/** Whether this person may edit the menu or intake form for a category. */
export function canEditCategory(
  staffId: string | null | undefined,
  category: ServiceCategory,
): boolean {
  return allowedCategories(staffId).includes(category);
}

/**
 * Whether `viewerId` may edit `targetId`'s working schedule. Admins may edit
 * anyone's; everyone else only their own.
 */
export function canEditStaffSchedule(
  viewerId: string | null | undefined,
  targetId: string,
): boolean {
  if (isAdmin(viewerId)) return true;
  return !!viewerId && viewerId === targetId;
}

/**
 * Whether this person may edit studio-wide settings — store hours, the barber
 * Thursday late close, payments, and other people's permissions.
 */
export function canEditStudioSettings(staffId: string | null | undefined): boolean {
  return isAdmin(staffId);
}

/**
 * The roster ordered for a particular viewer: that person first, everyone else
 * in roster order. The day grid is wider than a phone screen, so the leftmost
 * column is the only one guaranteed to be visible without panning — it should
 * belong to whoever is signed in.
 *
 * An empty or unknown id (no session, or a staff member who has left the
 * roster) returns the roster untouched.
 */
export function staffOrderedFor(viewerId: string | null | undefined): StaffMember[] {
  const viewer = viewerId ? STAFF_BY_ID.get(viewerId) : undefined;
  if (!viewer) return STAFF;
  return [viewer, ...STAFF.filter(m => m.id !== viewer.id)];
}

/** The staff member who performs a given service category, if any. */
export function staffForCategory(cat: ServiceCategory): string | undefined {
  return STAFF.find(m => m.categories.includes(cat))?.id;
}

// ── Service name → category ──────────────────────────────────────────────────────
// Appointments store the service *name* (e.g. "Classic Full Body"), so we build a
// name → category lookup from the static service catalogue. Used to colour an
// appointment by the staff member's per-category override.
const CATEGORY_BY_SERVICE_NAME = new Map<string, ServiceCategory>();
for (const svc of [...BARBER_SERVICES, ...TAN_SERVICES, ...TAN_ADDONS, ...LASH_SERVICES, ...LASH_ADDONS]) {
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
