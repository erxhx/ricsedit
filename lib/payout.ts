/**
 * Payout maths — what a staff member takes home, as opposed to what the studio
 * takes in.
 *
 * A restricted viewer (see lib/staff-permissions) has no business seeing the
 * studio's gross takings, but "your revenue" was showing them exactly that:
 * the full menu price of everything they performed. What they actually earn is
 * a commission on the service plus their tips, so that is what they now see.
 *
 * Two conventions worth knowing, both chosen to match how gross revenue was
 * already counted elsewhere rather than to invent new rules here:
 *
 *  - **No-shows count.** Every revenue figure in the admin includes `no_show`
 *    appointments and excludes `cancelled` and `blocked` ones. Payout uses the
 *    same set, so a payout is always exactly `rate x (the gross that viewer
 *    would otherwise have seen) + tips`, which is the easiest thing to explain
 *    when someone queries their number. Whether a no-show should really pay
 *    commission is a business call, not a display one.
 *
 *  - **Refunded payments pay no tip.** A refund sends the money back, so the
 *    tip went with it. The service side still follows the convention above.
 *
 * Tips are only ever recorded when a client tips through the online booking
 * flow — the Square `tipCents` on the payment. Cash left at the counter is not
 * in this data and cannot be, so these figures are a floor on what someone
 * earned, not a payslip.
 */

import type { Appointment } from './admin-mock';

export interface PayoutBreakdown {
  /** Commission on service prices, in dollars. */
  service: number;
  /** Recorded tips, in dollars. */
  tips: number;
  /** service + tips, in dollars. */
  total: number;
}

/** Round to whole cents — rates like 0.5 on odd prices land on halves. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * A share of the service price, 0–1. Anything absent, negative, over 1 or NaN
 * collapses to 0: a missing rate should show nothing, never the full price.
 */
export function clampRate(rate: number | null | undefined): number {
  if (typeof rate !== 'number' || !Number.isFinite(rate)) return 0;
  return Math.min(1, Math.max(0, rate));
}

/** Tips recorded against one appointment, in dollars. */
export function tipsOf(appt: Appointment): number {
  const p = appt.payment;
  if (!p || p.refunded) return 0;
  return round2((p.tipCents ?? 0) / 100);
}

/** What one appointment pays out: commission on the service, plus its tips. */
export function payoutOf(appt: Appointment, rate: number): number {
  return round2(round2(appt.price * clampRate(rate)) + tipsOf(appt));
}

/** Split a set of appointments into its service and tip components. */
export function payoutBreakdown(appts: Appointment[], rate: number): PayoutBreakdown {
  const r = clampRate(rate);
  let service = 0;
  let tips = 0;
  for (const a of appts) {
    service += round2(a.price * r);
    tips    += tipsOf(a);
  }
  service = round2(service);
  tips    = round2(tips);
  return { service, tips, total: round2(service + tips) };
}

/**
 * Money for display. Whole dollars stay clean; halves and cents show both
 * decimals, because "$17.5" reads like a typo on a payout figure.
 */
export function fmtMoney(n: number): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}
