import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { getIntakeForm, saveIntakeForm } from '@/lib/intake-form-store';
import { canEditCategory } from '@/lib/staff';
import type { FormCategory, IntakeFormConfig } from '@/lib/intake-form-store';

const CATEGORIES: FormCategory[] = ['tan', 'wax', 'barber', 'lashes'];

async function auth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

/**
 * Resolves the requested category and checks the caller owns it. Returns
 * either the category or the response to send back, so each verb stays a
 * two-liner and none of them can forget the permission check.
 */
function resolveCategory(
  req: NextRequest,
  staffId: string,
): { cat: FormCategory; error: null } | { cat: null; error: NextResponse } {
  const cat = (req.nextUrl.searchParams.get('category') ?? 'tan') as FormCategory;
  if (!CATEGORIES.includes(cat)) {
    return { cat: null, error: NextResponse.json({ error: 'Invalid category' }, { status: 400 }) };
  }
  if (!canEditCategory(staffId, cat)) {
    return { cat: null, error: NextResponse.json({ error: 'Not your form category' }, { status: 403 }) };
  }
  return { cat, error: null };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { cat, error } = resolveCategory(req, session.sub);
  if (error) return error;
  return NextResponse.json(await getIntakeForm(cat));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { cat, error } = resolveCategory(req, session.sub);
  if (error) return error;
  const config = await req.json() as IntakeFormConfig;
  const ok = await saveIntakeForm(cat, config);
  return ok ? NextResponse.json(config) : NextResponse.json({ error: 'Save failed' }, { status: 500 });
}

/** DELETE — clears the saved config so the hardcoded default is used on next GET */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { cat, error } = resolveCategory(req, session.sub);
  if (error) return error;
  const { db } = await import('@/lib/supabase');
  await db.from('settings').delete().eq('key', `intake_form_${cat}`);
  // Return the fresh default
  const { getIntakeForm } = await import('@/lib/intake-form-store');
  return NextResponse.json(await getIntakeForm(cat));
}
