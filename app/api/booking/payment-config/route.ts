/**
 * Public endpoint — tells the booking widget whether a category requires
 * payment at booking, what's due, and the Web Payments SDK config.
 *
 * GET /api/booking/payment-config?category=lashes&total=150
 * → { required, mode, cardOnFile, amountDueCents, applicationId, locationId, env }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentSettings, amountDueCents, prepayAmountCents, CATEGORIES } from '@/lib/payment-settings';
import { squareConfigured, squarePublicConfig } from '@/lib/square';
import { taxBreakdownCents } from '@/lib/tax';
import { getServicesStoreAsync, getAllServices } from '@/lib/services-store';
import type { ServiceCategory } from '@/lib/services';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const cat = req.nextUrl.searchParams.get('category') as ServiceCategory;
  const total = Number(req.nextUrl.searchParams.get('total') ?? 0);
  // Comma-separated catalogue ids of the selected services + add-ons —
  // resolved server-side so tax (GST on services, GST+PST on products)
  // is computed from authoritative prices, never the client's.
  const itemIds = (req.nextUrl.searchParams.get('items') ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean).slice(0, 12);

  if (!CATEGORIES.includes(cat)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400, headers: CORS });
  }

  const settings = await getPaymentSettings();
  const policy = settings[cat];
  const configured = squareConfigured();

  // Resolve items → authoritative subtotal + tax. Unknown ids fall back to
  // the client-supplied total as a service-only (GST) amount.
  await getServicesStoreAsync();
  const catalogue = new Map(getAllServices().map((s) => [s.id, s]));
  const items = itemIds.map((id) => catalogue.get(id)).filter((s) => !!s);
  const subtotal = items.length ? items.reduce((s, x) => s + x.price, 0) : total;
  const tax = taxBreakdownCents(items.length ? items : [{ price: total }]);

  // `required` — the funnel must render payment and block confirm: money is
  // owed now (deposit/prepay) or a card must be stored.
  // `allowPrepay` — optional full prepayment offered; booking still succeeds
  // without it, so the funnel shows an opt-in "pay now" affordance.
  const wantsMoney = policy.mode !== 'off';
  const required = configured && (wantsMoney || policy.cardOnFile);
  const allowPrepay = configured && policy.allowPrepay;
  const fullPrepayPossible = policy.mode === 'prepay' || allowPrepay;

  return NextResponse.json({
    required,
    allowPrepay,
    mode: policy.mode,
    cardOnFile: policy.cardOnFile,
    // Deposits are partial holds — untaxed (tax settles at the POS).
    // A required full prepay is taxed, so amountDueCents includes tax then.
    amountDueCents: configured && wantsMoney
      ? amountDueCents(policy, subtotal) + (policy.mode === 'prepay' ? tax.taxCents : 0)
      : 0,
    // Full-prepay breakdown (required prepay mode or optional opt-in):
    // pre-tax base (tips are on this), tax lines, and the taxed total.
    prepayBaseCents: fullPrepayPossible && configured ? prepayAmountCents(subtotal) : 0,
    prepayGstCents:  fullPrepayPossible && configured ? tax.gstCents : 0,
    prepayPstCents:  fullPrepayPossible && configured ? tax.pstCents : 0,
    prepayAmountCents: fullPrepayPossible && configured
      ? prepayAmountCents(subtotal) + tax.taxCents : 0,
    ...squarePublicConfig(),
  }, { headers: { ...CORS, 'Cache-Control': 'no-store' } });
}
