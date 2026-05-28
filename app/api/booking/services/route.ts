/**
 * Public endpoint — returns the current services, prices, and durations.
 * Used by editstudio.space/booking.jsx so price/name edits in the admin
 * flow through to the live booking calendar without a redeploy.
 *
 * GET /api/booking/services
 * Response: ServicesData { barberServices, tanServices, tanAddons, waxGroups }
 */

import { NextResponse } from 'next/server';
import { getServicesStoreAsync } from '@/lib/services-store';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET() {
  const data = await getServicesStoreAsync();
  return NextResponse.json(data, {
    headers: { ...CORS, 'Cache-Control': 'no-store' },
  });
}
