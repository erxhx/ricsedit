/**
 * Per-staff permissions — owner-configurable in admin Settings.
 *
 * Currently governs revenue visibility: whether a staff member sees
 * studio-wide revenue or only their own. Defaults come from the roster
 * (lib/staff.ts); the owner can override per person, persisted to the
 * `settings` table under `staff_permissions`.
 */

import { db } from './supabase';
import { STAFF, isAdmin } from './staff';
import type { Appointment } from './admin-mock';

export interface StaffPermissions {
  canSeeAllRevenue: boolean;
  /**
   * Share of the service price this person is paid, 0–1 — see
   * StaffMember.commissionRate. Lives here rather than only in the roster so a
   * raise doesn't need a deploy.
   */
  commissionRate: number;
}

const KEY = 'staff_permissions';

/** Roster-derived defaults, keyed by staff id. */
export function defaultPermissions(): Record<string, StaffPermissions> {
  const out: Record<string, StaffPermissions> = {};
  for (const m of STAFF) {
    out[m.id] = { canSeeAllRevenue: m.canSeeAllRevenue, commissionRate: m.commissionRate };
  }
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
        // A saved rate outside 0–1 is ignored rather than clamped: it means the
        // stored value is wrong, and the roster default is the better guess.
        const rate = saved[id]?.commissionRate;
        if (typeof rate === 'number' && Number.isFinite(rate) && rate >= 0 && rate <= 1) {
          perms[id].commissionRate = rate;
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
 * Whether a viewer may see studio-wide revenue. Admins always can — that is
 * what "full access" means, and it can't be toggled off from under them;
 * everyone else is governed by their `canSeeAllRevenue` permission.
 *
 * `role` is kept for call-site compatibility but no longer decides anything:
 * it comes from the session JWT, which can be up to 90 days stale, whereas
 * the roster is current.
 */
export function canViewAllRevenue(
  staffId: string,
  role: string,
  perms: Record<string, StaffPermissions>,
): boolean {
  if (isAdmin(staffId)) return true;
  return perms[staffId]?.canSeeAllRevenue ?? false;
}

/** The payout rate to apply for a viewer. Unknown ids get nothing. */
export function payoutRateFor(
  staffId: string,
  perms: Record<string, StaffPermissions>,
): number {
  return perms[staffId]?.commissionRate ?? 0;
}

/**
 * Redact revenue from appointments the viewer isn't allowed to see. When the
 * viewer can't see studio-wide revenue, strip the money from any appointment
 * that isn't their own — so other staff's revenue never reaches the client,
 * not just gets hidden in the UI.
 *
 * That means the payment amounts and the hand-logged tip list as well as
 * `price`. Tips are part of a payout now, which makes someone else's tips
 * exactly as sensitive as their service price. The `prepaid` and `refunded`
 * flags survive: they carry no amount, and the day grid uses them to badge a
 * card as paid.
 */
export function redactRevenue(
  appts: Appointment[],
  viewerStaff: string,
  canSeeAll: boolean,
): Appointment[] {
  if (canSeeAll) return appts;
  return appts.map((a) => {
    if (a.staff === viewerStaff) return a;
    const clean: Appointment = { ...a, price: 0, manualTips: undefined };
    if (a.payment) {
      clean.payment = {
        ...a.payment,
        amountCents: 0,
        tipCents: 0,
        gstCents: 0,
        pstCents: 0,
        balanceDueCents: 0,
        noShowCharge: undefined,
      };
    }
    return clean;
  });
}
