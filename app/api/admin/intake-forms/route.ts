import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { getIntakeForm, saveIntakeForm } from '@/lib/intake-form-store';
import type { FormCategory, IntakeFormConfig } from '@/lib/intake-form-store';

const CATEGORIES: FormCategory[] = ['tan', 'wax', 'barber'];

async function auth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

export async function GET(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const cat = (req.nextUrl.searchParams.get('category') ?? 'tan') as FormCategory;
  if (!CATEGORIES.includes(cat)) return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  return NextResponse.json(await getIntakeForm(cat));
}

export async function POST(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const cat = (req.nextUrl.searchParams.get('category') ?? 'tan') as FormCategory;
  if (!CATEGORIES.includes(cat)) return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  const config = await req.json() as IntakeFormConfig;
  const ok = await saveIntakeForm(cat, config);
  return ok ? NextResponse.json(config) : NextResponse.json({ error: 'Save failed' }, { status: 500 });
}
