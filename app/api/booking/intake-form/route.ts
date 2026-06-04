import { NextRequest, NextResponse } from 'next/server';
import { getIntakeForm } from '@/lib/intake-form-store';
import type { FormCategory } from '@/lib/intake-form-store';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const cat = (req.nextUrl.searchParams.get('category') ?? 'tan') as FormCategory;
  if (!['tan', 'wax'].includes(cat)) {
    return NextResponse.json({ error: 'No intake form for this category' }, { status: 400, headers: CORS });
  }
  const form = await getIntakeForm(cat);
  return NextResponse.json(form, { headers: { ...CORS, 'Cache-Control': 'no-store' } });
}
