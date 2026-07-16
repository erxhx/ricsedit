/**
 * Square catalog price sync — owner-triggered.
 * POST — run a sync now, return the report.
 * GET  — return the last stored report.
 */

import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { squareProdConfigured, syncCatalogPrices, getLastSyncReport } from '@/lib/square-catalog';

async function auth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

export async function POST() {
  const session = await auth();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!squareProdConfigured()) {
    return Response.json({ error: 'Production Square token not configured.' }, { status: 400 });
  }
  const report = await syncCatalogPrices();
  return Response.json({ report }, { status: report.error ? 502 : 200 });
}

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json({ report: await getLastSyncReport() });
}
