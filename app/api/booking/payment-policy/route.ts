/**
 * Public endpoint — payment policy for a service category, so the booking
 * funnel knows whether to render a payment/card step. With everything 'off'
 * (the default) the funnel behaves exactly as before.
 *
 * GET /api/booking/payment-policy?category=lashes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentSettings, CATEGORIES } from '@/lib/payment-settings';
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
  const cat = req.nextUrl.searchParams.get('category') as ServiceCategory | null;
  if (!cat || !CATEGORIES.includes(cat)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400, headers: CORS });
  }
  const settings = await getPaymentSettings();
  return NextResponse.json(settings[cat], { headers: { ...CORS, 'Cache-Control': 'no-store' } });
}
