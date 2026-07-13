/**
 * Sales tax for online payments — British Columbia.
 *
 *   Services (haircuts, tans, waxing, lashes, treatments): 5% GST only.
 *   Products (physical goods — disposable undies/bra):     5% GST + 7% PST.
 *
 * Tax is collected online only when the FULL service amount is being paid
 * (required prepay mode, or the client opting into optional prepay).
 * Deposits are partial holds — the POS collects tax on the full bill at
 * settlement, so taxing the deposit too would double-collect.
 *
 * Rounding follows receipt convention: each tax is rounded once, on its
 * total base, not per line item.
 *
 * Tip percentages apply to the taxed total (subtotal + tax), matching the
 * in-person POS — e.g. $40 + $2 GST → 18% tip = $7.56 → $49.56 collected.
 */

import type { Service } from './services';

export const GST_RATE = 0.05;
export const PST_RATE = 0.07;

/**
 * Ids of catalogue items that are physical goods. Fallback for services
 * stored in the DB before the `isProduct` flag existed — the persisted
 * rows lack the flag, so id membership keeps them taxed correctly.
 */
export const PRODUCT_IDS = new Set(['addon-bra', 'addon-undies']);

export function isProductItem(item: { id?: string; isProduct?: boolean }): boolean {
  return item.isProduct === true || (!!item.id && PRODUCT_IDS.has(item.id));
}

export interface TaxBreakdown {
  gstCents: number;
  pstCents: number;
  taxCents: number; // gst + pst
}

/** GST on everything, PST on products only. Prices in dollars. */
export function taxBreakdownCents(
  items: Array<Pick<Service, 'price'> & { id?: string; isProduct?: boolean }>,
): TaxBreakdown {
  const subtotal = items.reduce((s, x) => s + (x.price || 0), 0);
  const products = items.filter(isProductItem).reduce((s, x) => s + (x.price || 0), 0);
  const gstCents = Math.round(subtotal * GST_RATE * 100);
  const pstCents = Math.round(products * PST_RATE * 100);
  return { gstCents, pstCents, taxCents: gstCents + pstCents };
}
