/**
 * Public endpoint — returns the current studio weekly schedule.
 * Used by the live editstudio.space site to keep its booking calendar in sync.
 *
 * GET /api/booking/hours
 * Response: AvailabilityConfig  { days, barberThuClose }
 */

import { NextResponse } from 'next/server';
import { getAvailabilityConfig } from '@/lib/availability-store';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET() {
  const config = await getAvailabilityConfig();
  return NextResponse.json(config, {
    headers: { ...CORS, 'Cache-Control': 'no-store' },
  });
}
