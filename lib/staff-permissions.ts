/**
 * Per-staff permissions — owner-configurable in admin Settings.
 *
 * Currently governs revenue visibility: whether a staff member sees
 * studio-wide revenue or only their own. Defaults come from the roster
 * (lib/staff.ts); the owner can override per person, persisted to the
 * `settings` table under `staff_permissions`.
 */

import { db } from './supabase';
import { STAFF } from './staff';

export interface StaffPermissions {
  canSeeAllRevenue: boolean;
}

const KEY = 'staff_permissions';

/** Roster-derived defaults, keyed by staff id. */
export function defaultPermissions(): Record<string, StaffPermissions> {
  const out: Record<string, StaffPermissions> = {};
  for (const m of STAFF) out[m.id] = { canSeeAllRevenue: m.canSeeAllRevenue };
  return out;
}

/** Current permissions = roster defaults merged with any saved overrides. */
export async function getStaffPermissions(): Promise<Record<string, StaffPermissions>> {
  const perms = defaultPermissions();
  try {
    const { data } = await db.from('settings').select('value').eq('key', KEY).maybeSingle();
    const saved = data?.value as Record<string, Partial<StaffPermissions>> | undefined;
    if (saved && typeof saved === 'object') {
      for (const id of Object.keys(perms)) {
        if (typeof saved[id]?.canSeeAllRevenue === 'boolean') {
          perms[id].canSeeAllRevenue = saved[id]!.canSeeAllRevenue!;
        }
      }
    }
  } catch { /* fall back to defaults */ }
  return perms;
}

export async function saveStaffPermissions(perms: Record<string, StaffPermissions>): Promise<boolean> {
  try {
    const { error } = await db.from('settings').upsert({
      key: KEY,
      value: perms,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch { return false; }
}

/**
 * Whether a viewer may see studio-wide revenue. Owners always can;
 * everyone else is governed by their `canSeeAllRevenue` permission.
 */
export function canViewAllRevenue(
  staffId: string,
  role: string,
  perms: Record<string, StaffPermissions>,
): boolean {
  if (role === 'owner') return true;
  return perms[staffId]?.canSeeAllRevenue ?? false;
}
