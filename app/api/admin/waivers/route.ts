import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { getWaiverConfig, saveWaiverConfig } from '@/lib/waiver-store';
import type { WaiverConfig } from '@/lib/waiver-store';

async function auth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

export async function GET() {
  if (!await auth()) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json(await getWaiverConfig());
}

export async function POST(request: Request) {
  if (!await auth()) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json() as WaiverConfig;
  const ok = await saveWaiverConfig(body);
  return ok ? Response.json({ ok: true }) : Response.json({ error: 'Failed to save' }, { status: 500 });
}
