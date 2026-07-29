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

  // Merge onto current (defaults + saved), taking only the known fields and
  // only when they are the right shape. Iterating the roster's ids rather than
  // the body's keys means an unknown id can't add a staff member by proxy.
  const perms = await getStaffPermissions();
  for (const id of Object.keys(perms)) {
    if (typeof body[id]?.canSeeAllRevenue === 'boolean') {
      perms[id].canSeeAllRevenue = body[id]!.canSeeAllRevenue!;
    }
    if (body[id]?.commissionRate !== undefined) {
      const rate = body[id]!.commissionRate;
      // Reject rather than clamp: a rate outside 0–1 means the caller is
      // confused (sending 50 for 50%, say), and silently storing 1 would
      // quietly pay someone the whole service price.
      if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0 || rate > 1) {
        return NextResponse.json(
          { error: 'commissionRate must be a number between 0 and 1' },
          { status: 400 },
        );
      }
      perms[id].commissionRate = rate;
    }
  }

  const ok = await saveStaffPermissions(perms);
  return ok ? NextResponse.json(perms) : NextResponse.json({ error: 'Save failed' }, { status: 500 });
}
