/**
 * Public endpoint — tells the booking widget whether a category requires
 * payment at booking, what's due, and the Web Payments SDK config.
 *
 * GET /api/booking/payment-config?category=lashes&total=150
 * → { required, mode, cardOnFile, amountDueCents, applicationId, locationId, env }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentSettings, amountDueCents, CATEGORIES } from '@/lib/payment-settings';
import { squareConfigured, squarePublicConfig } from '@/lib/square';
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

  if (!CATEGORIES.includes(cat)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400, headers: CORS });
  }

  const settings = await getPaymentSettings();
  const policy = settings[cat];
  const configured = squareConfigured();

  // Payment UI is needed when Square is set up AND the policy asks for
  // either money now (deposit/full) or a card on file.
  const wantsMoney = policy.mode !== 'off';
  const required = configured && (wantsMoney || policy.cardOnFile);

  return NextResponse.json({
    required,
    mode: policy.mode,
    cardOnFile: policy.cardOnFile,
    amountDueCents: configured && wantsMoney ? amountDueCents(policy, total) : 0,
    ...squarePublicConfig(),
  }, { headers: { ...CORS, 'Cache-Control': 'no-store' } });
}
