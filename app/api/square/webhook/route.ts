/**
 * Square webhook receiver (production account).
 *
 * Verified with HMAC-SHA256 over (notification_url + raw_body) using the
 * subscription's signature key — requests that don't verify are dropped.
 *
 * Handled events:
 *   catalog.version.updated  → re-sync menu prices from the catalog
 *                              (debounced; Square fires several per edit)
 *   payment.* / refund.*     → recorded to a ring buffer for the future
 *                              all-revenue admin view
 *   dispute.*                → recorded + immediate owner push notification
 */

import crypto from 'crypto';
import { db } from '@/lib/supabase';
import { syncCatalogPrices } from '@/lib/square-catalog';
import { sendPushToStaff } from '@/lib/push';

const EVENTS_KEY = 'square_pos_events';
const MAX_EVENTS = 200;

// Debounce catalog syncs: Square sends a burst of version events per edit.
let lastCatalogSync = 0;
const CATALOG_SYNC_COOLDOWN_MS = 20_000;

function verifySignature(rawBody: string, signature: string | null): boolean {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const url = process.env.SQUARE_WEBHOOK_URL;
  if (!key || !url || !signature) return false;
  const expected = crypto.createHmac('sha256', key).update(url + rawBody).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false; // length mismatch
  }
}

async function recordEvent(entry: Record<string, unknown>): Promise<void> {
  try {
    const { data } = await db.from('settings').select('value').eq('key', EVENTS_KEY).maybeSingle();
    const list = Array.isArray(data?.value) ? (data.value as unknown[]) : [];
    list.unshift(entry);
    await db.from('settings').upsert({
      key: EVENTS_KEY,
      value: list.slice(0, MAX_EVENTS),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[square/webhook] event record failed', err);
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-square-hmacsha256-signature');

  if (!verifySignature(rawBody, signature)) {
    return Response.json({ error: 'invalid signature' }, { status: 401 });
  }

  let event: { type?: string; event_id?: string; created_at?: string; data?: { object?: Record<string, unknown> } };
  try { event = JSON.parse(rawBody); } catch {
    return Response.json({ error: 'bad payload' }, { status: 400 });
  }
  const type = event.type ?? '';

  if (type === 'catalog.version.updated') {
    const now = Date.now();
    if (now - lastCatalogSync > CATALOG_SYNC_COOLDOWN_MS) {
      lastCatalogSync = now;
      // Await so the serverless invocation isn't frozen mid-sync.
      const report = await syncCatalogPrices();
      console.log(`[square/webhook] catalog sync: ${report.changes.length} change(s)`);
    }
    return Response.json({ ok: true });
  }

  if (/^(payment|refund|dispute)\./.test(type)) {
    const obj = (event.data?.object ?? {}) as Record<string, Record<string, unknown>>;
    const inner = obj.payment ?? obj.refund ?? obj.dispute ?? {};
    await recordEvent({
      type,
      at: event.created_at ?? new Date().toISOString(),
      id: inner.id ?? event.event_id,
      amountCents: (inner.amount_money as { amount?: number } | undefined)?.amount
        ?? (inner.amount_disputed_money as { amount?: number } | undefined)?.amount ?? null,
      status: inner.status ?? null,
      sourceType: inner.source_type ?? null,
    });

    if (type.startsWith('dispute.')) {
      const cents = Number((inner.amount_disputed_money as { amount?: number } | undefined)?.amount ?? 0);
      sendPushToStaff('eric', {
        title: 'Square dispute ⚠️',
        body: `A payment dispute (${type.split('.')[1] ?? 'update'}) ${cents ? `for $${(cents / 100).toFixed(2)} ` : ''}needs attention in the Square dashboard.`,
        url: '/admin/settings',
        tag: 'square-dispute',
      }).catch(() => {});
    }
    return Response.json({ ok: true });
  }

  // Unhandled event type — acknowledge so Square doesn't retry.
  return Response.json({ ok: true, ignored: type });
}
