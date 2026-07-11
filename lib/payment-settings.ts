/**
 * Per-category payment policies — owner-configurable in admin Settings.
 * Persisted in the `settings` table under 'payment_settings' (no schema
 * change). Everything defaults to OFF: enabling payments is always an
 * explicit owner action per service category.
 *
 * mode:
 *   'off'     — no payment step at booking
 *   'deposit' — charge a partial amount at booking (flat $ or % of price)
 *   'prepay'  — charge the full service price at booking
 * cardOnFile — store the card with Square at booking (consent collected in
 *              the funnel) so no-show fees can be charged later. Independent
 *              of mode: can be required with or without an upfront charge.
 */

import { db } from './supabase';
import type { ServiceCategory } from './services';

export interface CategoryPaymentPolicy {
  mode: 'off' | 'deposit' | 'prepay';
  cardOnFile: boolean;
  depositType: 'flat' | 'percent';
  depositValue: number; // dollars when flat, 1–100 when percent
}

export type PaymentSettings = Record<ServiceCategory, CategoryPaymentPolicy>;

const KEY = 'payment_settings';

const OFF: CategoryPaymentPolicy = {
  mode: 'off',
  cardOnFile: false,
  depositType: 'flat',
  depositValue: 20,
};

export const CATEGORIES: ServiceCategory[] = ['barber', 'tan', 'wax', 'lashes'];

export function defaultPaymentSettings(): PaymentSettings {
  return {
    barber: { ...OFF },
    tan:    { ...OFF },
    wax:    { ...OFF },
    lashes: { ...OFF },
  };
}

function sanitize(raw: unknown): PaymentSettings {
  const out = defaultPaymentSettings();
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, Partial<CategoryPaymentPolicy>>;
  for (const cat of CATEGORIES) {
    const p = r[cat];
    if (!p) continue;
    if (p.mode === 'off' || p.mode === 'deposit' || p.mode === 'prepay') out[cat].mode = p.mode;
    if (typeof p.cardOnFile === 'boolean') out[cat].cardOnFile = p.cardOnFile;
    if (p.depositType === 'flat' || p.depositType === 'percent') out[cat].depositType = p.depositType;
    if (typeof p.depositValue === 'number' && isFinite(p.depositValue) && p.depositValue > 0) {
      out[cat].depositValue = Math.min(p.depositType === 'percent' ? 100 : 10_000, Math.round(p.depositValue * 100) / 100);
    }
  }
  return out;
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  try {
    const { data } = await db.from('settings').select('value').eq('key', KEY).maybeSingle();
    if (data?.value) return sanitize(data.value);
  } catch { /* fall through */ }
  return defaultPaymentSettings();
}

export async function savePaymentSettings(settings: PaymentSettings): Promise<boolean> {
  try {
    const { error } = await db.from('settings').upsert({
      key: KEY,
      value: sanitize(settings),
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch { return false; }
}

/** Amount (in cents) to charge at booking for a category, given the total price. */
export function amountDueCents(policy: CategoryPaymentPolicy, totalPrice: number): number {
  if (policy.mode === 'prepay') return Math.round(totalPrice * 100);
  if (policy.mode === 'deposit') {
    const amt = policy.depositType === 'percent'
      ? totalPrice * (policy.depositValue / 100)
      : policy.depositValue;
    // Never charge more than the service itself
    return Math.round(Math.min(amt, totalPrice) * 100);
  }
  return 0;
}
