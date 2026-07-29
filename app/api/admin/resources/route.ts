import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { getResources, saveResources, type Resource } from '@/lib/resources';
import { isAdmin } from '@/lib/staff';
import type { ServiceCategory } from '@/lib/services';

const CATEGORIES: ServiceCategory[] = ['barber', 'tan', 'wax', 'lashes'];

async function auth() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Rooms are studio-wide configuration, like store hours.
  if (!isAdmin(session.sub)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await getResources());
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.sub)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: 'Expected an array of resources' }, { status: 400 });
  }

  const resources: Resource[] = [];
  for (const raw of body) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === 'string' ? r.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Every room needs a name' }, { status: 400 });
    }
    const id = typeof r.id === 'string' && r.id ? r.id : `room-${Date.now().toString(36)}`;
    const categories = Array.isArray(r.categories)
      ? (r.categories as unknown[]).filter((c): c is ServiceCategory =>
          CATEGORIES.includes(c as ServiceCategory))
      : [];
    resources.push({ id, name: name.slice(0, 60), categories });
  }

  const persisted = await saveResources(resources);
  return NextResponse.json({ ok: true, persisted, resources });
}
