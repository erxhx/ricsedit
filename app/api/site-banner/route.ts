/**
 * Public endpoint — returns the current banner config for the live site.
 * Called by app.jsx on load to apply any admin-set banner overrides.
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const DEFAULT = {
  enabled: true,
  text: 'Late night bookings available until 9pm Thursdays',
  target: 'barber',
  style: 'lime',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET() {
  try {
    const { data } = await db.from('settings').select('value').eq('key', 'site_banner').maybeSingle();
    const cfg = data?.value ?? DEFAULT;
    return NextResponse.json(cfg, { headers: { ...CORS, 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json(DEFAULT, { headers: CORS });
  }
}
