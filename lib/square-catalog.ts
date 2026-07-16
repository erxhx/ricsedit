/**
 * Square catalog → site menu price sync.
 *
 * Square (PRODUCTION account — the same catalog the in-person POS sells
 * from) is the single source of truth for PRICES. The app keeps owning
 * everything Square doesn't model: durations, categories, waiver flags,
 * descriptions, add-on grouping.
 *
 * Matching is by normalized name plus a small synonym table, so when a
 * new item is added in Square under a sensible name it maps on the next
 * sync with no code change. Ids are never stored — the mapping is
 * recomputed each sync and therefore self-healing.
 *
 * Uses SQUARE_PROD_ACCESS_TOKEN (read-only usage: catalog list). Online
 * payments stay in the sandbox environment (lib/square.ts) until go-live.
 */

import { SquareClient, SquareEnvironment } from 'square';
import { db } from './supabase';
import { getServicesStoreAsync, saveServicesStore } from './services-store';
import { sendPushToStaff } from './push';
import type { Service } from './services';

export function squareProdConfigured(): boolean {
  return !!process.env.SQUARE_PROD_ACCESS_TOKEN;
}

function prodClient(): SquareClient {
  return new SquareClient({
    token: process.env.SQUARE_PROD_ACCESS_TOKEN!,
    environment: SquareEnvironment.Production,
  });
}

/** Site service name → Square item name, for the pairs whose names differ
 * beyond normalization. Keys/values are compared normalized. */
const SYNONYMS: Record<string, string> = {
  'kids cut':                       'kid s haircut',
  'senior cut':                     'seniors cut',
  'classic full body':              'classic tan',
  'rapid full body':                'rapid tan',
  'face tan':                       'face glow',
  'disposable undies':              'dispo undie',
  'disposable undies plus bra':     'dispo undie',   // combined menu item, one Square item
  'freshen up haircut':             'freshen up',
  'freshen up haircut plus beard':  'freshen up plus beard',
  'full back':                      'back',           // Square: "Back wax" (norm strips 'wax')
  'brow shape':                     'eyebrow shape',  // "Brow Wax & Shape" → "Eyebrow wax and shape"
  'prep plus lock':                 'prep lock',      // Square: "prep and lock"
};

/** Site service ids excluded from sync (none currently). The lash Brow Tint
 * was parked here until Eric confirmed the Square price ($40) is correct —
 * the sync now owns it like everything else. */
const SYNC_EXCLUDE = new Set<string>([]);

/** Light normalization: case/punctuation only. "Brow wax and tint" and
 * "Brow tint" stay DISTINCT here — needed because stripping filler words
 * would collide them. */
const rawNorm = (s: string): string => s.toLowerCase()
  .replace(/—|–|-/g, ' ').replace(/\+/g, ' plus ').replace(/&/g, ' and ').replace(/'/g, ' ')
  .replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

/** Aggressive normalization: also strips filler words so "Bikini" matches
 * "Bikini wax". Only consulted when no raw-exact match exists. */
const norm = (s: string): string => rawNorm(s)
  .replace(/\b(wax|waxing|the|a|and)\b/g, ' ')
  .replace(/\s+/g, ' ').trim();

const tokens = (s: string) => new Set(norm(s).split(' ').filter(Boolean));
function jaccard(a: string, b: string): number {
  const A = tokens(a), B = tokens(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  return inter / (A.size + B.size - inter || 1);
}

export interface SquareCatalogItem {
  name: string;
  type: string;      // REGULAR | APPOINTMENTS_SERVICE
  itemId: string;
  variationId: string;
  cents: number | null;
}

export async function fetchSquareCatalog(): Promise<SquareCatalogItem[]> {
  const client = prodClient();
  const out: SquareCatalogItem[] = [];
  let page = await client.catalog.list({ types: 'ITEM' });
  for (;;) {
    for (const o of page.data ?? []) {
      if (o.type !== 'ITEM') continue;
      const d = o.itemData;
      if (!d) continue;
      for (const v of d.variations ?? []) {
        if (v.type !== 'ITEM_VARIATION') continue;
        const cents = v.itemVariationData?.priceMoney?.amount;
        out.push({
          name: (d.name ?? '').trim(),
          type: d.productType ?? 'REGULAR',
          itemId: o.id!,
          variationId: v.id!,
          cents: cents != null ? Number(cents) : null,
        });
      }
    }
    if (!page.hasNextPage()) break;
    page = await page.getNextPage();
  }
  return out;
}

/** Best Square match for a site service, or null under the confidence bar.
 * Pass 1: raw-name equality (distinguishes "Brow wax and tint" from "Brow
 * tint"). Pass 2: synonym/stripped-name equality. Pass 3: token overlap. */
export function matchCatalogItem(service: Pick<Service, 'name'>, catalog: SquareCatalogItem[]): SquareCatalogItem | null {
  const raw = rawNorm(service.name);
  const exactRaw = catalog.find((i) => rawNorm(i.name) === raw);
  if (exactRaw) return exactRaw;

  const target = SYNONYMS[norm(service.name)] ?? norm(service.name);
  let best: SquareCatalogItem | null = null;
  let bestScore = 0;
  for (const item of catalog) {
    const score = norm(item.name) === target ? 1 : jaccard(target, item.name);
    if (score > bestScore ||
        (score === bestScore && best && item.type === 'APPOINTMENTS_SERVICE' && best.type !== 'APPOINTMENTS_SERVICE')) {
      best = item; bestScore = score;
    }
  }
  return (bestScore >= 0.99 || (bestScore >= 0.6 && best?.cents != null)) ? best : null;
}

export interface SyncReport {
  at: string;
  matched: number;
  changes: Array<{ id: string; name: string; from: number; to: number }>;
  unmatched: Array<{ id: string; name: string; price: number }>;
  error?: string;
}

/** Pull Square prices onto the site's services store. Notifies the owner of
 * any price movements. Persists the report under settings.square_sync_report. */
export async function syncCatalogPrices(): Promise<SyncReport> {
  const report: SyncReport = { at: new Date().toISOString(), matched: 0, changes: [], unmatched: [] };
  try {
    const catalog = await fetchSquareCatalog();
    const store = await getServicesStoreAsync();
    const all: Service[] = [
      ...store.barberServices,
      ...store.tanServices, ...store.tanAddons,
      ...store.waxGroups.flatMap((g) => g.services),
      ...store.lashServices,
    ];
    for (const svc of all) {
      if (SYNC_EXCLUDE.has(svc.id)) continue;
      const hit = matchCatalogItem(svc, catalog);
      if (!hit || hit.cents == null) {
        report.unmatched.push({ id: svc.id, name: svc.name, price: svc.price });
        continue;
      }
      report.matched++;
      const newPrice = hit.cents / 100;
      if (Math.round(svc.price * 100) !== hit.cents) {
        report.changes.push({ id: svc.id, name: svc.name, from: svc.price, to: newPrice });
        svc.price = newPrice;
      }
    }
    if (report.changes.length) {
      await saveServicesStore();
      const lines = report.changes.map((c) => `${c.name} $${c.from} → $${c.to}`);
      sendPushToStaff('eric', {
        title: 'Square price sync',
        body: `${lines.slice(0, 4).join(' · ')}${lines.length > 4 ? ` +${lines.length - 4} more` : ''} — site updated`,
        url: '/admin/settings',
        tag: 'square-sync',
      }).catch(() => {});
    }
  } catch (err) {
    report.error = err instanceof Error ? err.message : 'sync failed';
    console.error('[square-catalog] sync failed', err);
  }
  try {
    await db.from('settings').upsert({ key: 'square_sync_report', value: report, updated_at: new Date().toISOString() });
  } catch { /* report persistence is best-effort */ }
  return report;
}

export async function getLastSyncReport(): Promise<SyncReport | null> {
  try {
    const { data } = await db.from('settings').select('value').eq('key', 'square_sync_report').maybeSingle();
    return (data?.value as SyncReport) ?? null;
  } catch { return null; }
}
