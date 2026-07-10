/**
 * Web Push for the admin PWA — subscription storage + sending.
 *
 * Subscriptions are stored per staff member in the `settings` table under
 * key 'push_subscriptions' (no schema change): { [staffId]: PushSub[] }.
 * A staff member can have several devices; entries are deduped by endpoint
 * and pruned automatically when a push service reports them expired.
 *
 * Env (server): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
 */

import webpush from 'web-push';
import { db } from './supabase';

export interface StoredPushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const KEY = 'push_subscriptions';

function vapidConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function configure() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:bookings@editstudio.space',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

async function loadAll(): Promise<Record<string, StoredPushSub[]>> {
  try {
    const { data } = await db.from('settings').select('value').eq('key', KEY).maybeSingle();
    if (data?.value && typeof data.value === 'object') return data.value as Record<string, StoredPushSub[]>;
  } catch { /* fall through */ }
  return {};
}

async function saveAll(all: Record<string, StoredPushSub[]>): Promise<boolean> {
  try {
    const { error } = await db.from('settings').upsert({
      key: KEY, value: all, updated_at: new Date().toISOString(),
    });
    return !error;
  } catch { return false; }
}

/** Add (or refresh) a device subscription for a staff member. */
export async function addSubscription(staffId: string, sub: StoredPushSub): Promise<boolean> {
  const all = await loadAll();
  const list = all[staffId] ?? [];
  all[staffId] = [...list.filter((s) => s.endpoint !== sub.endpoint), sub];
  return saveAll(all);
}

/** Remove a device subscription (any staff — endpoint is globally unique). */
export async function removeSubscription(endpoint: string): Promise<boolean> {
  const all = await loadAll();
  for (const id of Object.keys(all)) {
    all[id] = all[id].filter((s) => s.endpoint !== endpoint);
  }
  return saveAll(all);
}

/** How many devices a staff member has enabled (for the settings UI). */
export async function subscriptionCount(staffId: string): Promise<number> {
  const all = await loadAll();
  return (all[staffId] ?? []).length;
}

/** "Wed, Jul 15 · 12:50pm" — compact when-string for notification bodies. */
export function fmtWhen(dateStr: string, startTime: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const day = new Date(y, mo - 1, d).toLocaleDateString('en-CA', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  const [h, m] = startTime.split(':').map(Number);
  const p = h >= 12 ? 'pm' : 'am';
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${day} · ${hr}:${String(m).padStart(2, '0')}${p}`;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Send a push to every device a staff member has enabled. Expired
 * subscriptions (404/410 from the push service) are pruned. Never throws —
 * push is always fire-and-forget from booking flows.
 */
export async function sendPushToStaff(staffId: string, payload: PushPayload): Promise<void> {
  if (!vapidConfigured()) return;
  try {
    configure();
    const all = await loadAll();
    const list = all[staffId] ?? [];
    if (!list.length) return;

    const dead: string[] = [];
    await Promise.all(list.map(async (sub) => {
      try {
        await webpush.sendNotification(sub as webpush.PushSubscription, JSON.stringify(payload));
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) dead.push(sub.endpoint);
        // other failures: transient — keep the subscription
      }
    }));

    if (dead.length) {
      all[staffId] = list.filter((s) => !dead.includes(s.endpoint));
      await saveAll(all);
    }
  } catch (err) {
    console.error('[push] send error', err);
  }
}
