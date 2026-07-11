import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { getPaymentSettings, savePaymentSettings } from '@/lib/payment-settings';
import type { PaymentSettings } from '@/lib/payment-settings';
import { squareConfigured, squareClient, squarePublicConfig } from '@/lib/square';

async function auth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

/**
 * GET — current payment settings + Square connection state.
 * With ?probe=1, actually calls Square to validate the token and list
 * locations (used to verify credentials and discover the location id).
 */
export async function GET(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await getPaymentSettings();
  const square: Record<string, unknown> = { configured: squareConfigured(), ...squarePublicConfig() };

  if (req.nextUrl.searchParams.get('probe') === '1' && squareConfigured()) {
    try {
      const res = await squareClient().locations.list();
      square.locations = (res.locations ?? []).map((l) => ({
        id: l.id, name: l.name, status: l.status, currency: l.currency,
      }));
    } catch (e) {
      square.probeError = e instanceof Error ? e.message.slice(0, 200) : 'probe failed';
    }
  }

  return NextResponse.json({ settings, square });
}

/** POST — save payment settings. Owner only. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null) as PaymentSettings | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const ok = await savePaymentSettings(body);
  return ok
    ? NextResponse.json({ settings: await getPaymentSettings() })
    : NextResponse.json({ error: 'Save failed' }, { status: 500 });
}
