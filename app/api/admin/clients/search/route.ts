import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { dbSearchClients } from '@/lib/db';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (q.trim().length < 2) return Response.json([]);

  return Response.json(await dbSearchClients(q));
}
