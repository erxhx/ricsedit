import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import {
  getAvailabilityConfig,
  saveAvailabilityConfig,
  DEFAULT_AVAILABILITY,
  type DayHours,
} from '@/lib/availability-store';

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
  if (!(await requireAuth())) {
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

  if (!raw.days) {
    return NextResponse.json({ error: 'Missing days' }, { status: 400 });
  }

  const days = parseDays(raw.days as Record<string, unknown>);

  const barberThuClose =
    typeof raw.barberThuClose === 'number'
      ? raw.barberThuClose
      : DEFAULT_AVAILABILITY.barberThuClose;

  // Per-staff schedules (optional — fall back to store hours if not provided)
  const rawStaff = (raw.staff ?? {}) as Record<string, Record<string, unknown>>;
  const staff = {
    eric: { days: rawStaff.eric?.days ? parseDays(rawStaff.eric.days as Record<string, unknown>) : { ...days } },
    livi: { days: rawStaff.livi?.days ? parseDays(rawStaff.livi.days as Record<string, unknown>) : { ...days } },
  };

  const persisted = await saveAvailabilityConfig({ days, barberThuClose, staff });
  return NextResponse.json({ ok: true, persisted });
}
