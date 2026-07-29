import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { getStaffPermissions, saveStaffPermissions } from '@/lib/staff-permissions';
import type { StaffPermissions } from '@/lib/staff-permissions';
import { isAdmin } from '@/lib/staff';

async function auth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await getStaffPermissions());
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Only admins may change who sees what. Checked against the roster rather
  // than the session's `role` claim, which predates the admin flag and would
  // have locked out Livi while the UI happily showed her the toggles.
  if (!isAdmin(session.sub)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null) as Record<string, Partial<StaffPermissions>> | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  // Merge onto current (defaults + saved), coercing the one known boolean field.
  const perms = await getStaffPermissions();
  for (const id of Object.keys(perms)) {
    if (typeof body[id]?.canSeeAllRevenue === 'boolean') {
      perms[id].canSeeAllRevenue = body[id]!.canSeeAllRevenue!;
    }
  }

  const ok = await saveStaffPermissions(perms);
  return ok ? NextResponse.json(perms) : NextResponse.json({ error: 'Save failed' }, { status: 500 });
}
