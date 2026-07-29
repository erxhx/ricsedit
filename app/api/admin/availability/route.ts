import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import {
  getAvailabilityConfig,
  saveAvailabilityConfig,
  type DayHours,
  type StaffSchedule,
} from '@/lib/availability-store';
import { STAFF, isAdmin, canEditStaffSchedule } from '@/lib/staff';

async function requireAuth() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

function parseDays(raw: Record<string, unknown> | undefined): Record<number, DayHours> {
  const days: Record<number, DayHours> = {};
  for (let d = 0; d <= 6; d++) {
    const v = raw?.[String(d)];
    days[d] =
      Array.isArray(v) && v.length === 2 &&
      typeof v[0] === 'number' && typeof v[1] === 'number'
        ? [v[0], v[1]]
        : null;
  }
  return days;
}

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const config = await getAvailabilityConfig();
  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const admin = isAdmin(session.sub);

  // This is a partial update, not a replace. Start from what's saved and lay
  // only the permitted fields on top — a restricted staff member POSTs just
  // their own schedule, and everything they didn't send has to survive.
  const current = await getAvailabilityConfig();

  // Store hours and the barber Thursday late close are studio-wide.
  if (!admin && (raw.days !== undefined || raw.barberThuClose !== undefined)) {
    return NextResponse.json(
      { error: 'You can only change your own schedule' },
      { status: 403 },
    );
  }

  const days = raw.days ? parseDays(raw.days as Record<string, unknown>) : current.days;

  const barberThuClose =
    typeof raw.barberThuClose === 'number' ? raw.barberThuClose : current.barberThuClose;

  // Per-staff schedules. Iterating the roster is load-bearing: this used to
  // build a hardcoded { eric, livi } pair, which silently dropped the schedule
  // of every staff member added after those two on each save.
  const rawStaff = (raw.staff ?? {}) as Record<string, Record<string, unknown> | undefined>;

  for (const id of Object.keys(rawStaff)) {
    if (!canEditStaffSchedule(session.sub, id)) {
      return NextResponse.json(
        { error: 'You can only change your own schedule' },
        { status: 403 },
      );
    }
  }

  const staff: Record<string, StaffSchedule> = {};
  for (const member of STAFF) {
    const incoming = rawStaff[member.id]?.days;
    staff[member.id] = incoming
      ? { days: parseDays(incoming as Record<string, unknown>) }
      : { days: current.staff[member.id]?.days ?? { ...days } };
  }

  const persisted = await saveAvailabilityConfig({ days, barberThuClose, staff });
  return NextResponse.json({ ok: true, persisted });
}
