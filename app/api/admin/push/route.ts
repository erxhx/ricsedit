import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { addSubscription, removeSubscription, subscriptionCount, sendPushToStaffDetailed } from '@/lib/push';
import type { StoredPushSub } from '@/lib/push';

async function auth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

/** GET — VAPID public key (runtime env, no rebuild coupling) + device count. */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({
    publicKey: process.env.VAPID_PUBLIC_KEY ?? null,
    devices: await subscriptionCount(session.sub),
  });
}

/** POST — store this device's subscription for the logged-in staff member. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sub = await req.json().catch(() => null) as StoredPushSub | null;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }
  const ok = await addSubscription(session.sub, {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
  return ok
    ? NextResponse.json({ ok: true, devices: await subscriptionCount(session.sub) })
    : NextResponse.json({ error: 'Save failed' }, { status: 500 });
}

/** PUT — send a test notification to the logged-in staff member's own
 * devices and return the push service's per-device results (diagnostic). */
export async function PUT() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const results = await sendPushToStaffDetailed(session.sub, {
    title: 'Test notification',
    body: `Push is working for ${session.name} 🎉`,
    url: '/admin/settings',
    tag: 'push-test',
  });
  return NextResponse.json({ results });
}

/** DELETE — remove this device's subscription. */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { endpoint } = await req.json().catch(() => ({})) as { endpoint?: string };
  if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
  await removeSubscription(endpoint);
  return NextResponse.json({ ok: true, devices: await subscriptionCount(session.sub) });
}
