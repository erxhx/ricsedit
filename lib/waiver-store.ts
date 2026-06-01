import { db } from './supabase';

export interface CategoryWaiver {
  enabled: boolean;
  text: string;
  checkboxLabel: string;
}

export interface WaiverConfig {
  tan: CategoryWaiver;
  wax: CategoryWaiver;
}

export const DEFAULT_WAIVERS: WaiverConfig = {
  tan: {
    enabled: true,
    text: 'I confirm I have no known allergies to the ingredients in NUDA spray tan solutions, and that I have followed the preparation guidelines — including exfoliating 24–48 hours prior and avoiding oils, lotions, and deodorant on the day of. I understand that results vary by skin type and preparation, and that Edit Studio is not liable for reactions resulting from undisclosed allergies or failure to follow prep guidelines.',
    checkboxLabel: 'I have read and agree to the above.',
  },
  wax: {
    enabled: true,
    text: 'I confirm I have not applied retinol, AHA/BHA exfoliants, or received direct sun exposure on the areas to be waxed within 24 hours prior to my appointment. I understand that waxing results vary by skin type and hair growth cycle, and that Edit Studio is not liable for reactions resulting from undisclosed skin conditions or failure to follow aftercare instructions.',
    checkboxLabel: 'I have read and agree to the above.',
  },
};

declare global {
  // eslint-disable-next-line no-var
  var __waiverCache: WaiverConfig | undefined;
}

function normalise(raw: unknown): WaiverConfig {
  if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_WAIVERS);
  const r = raw as Record<string, unknown>;
  function cat(key: string, def: CategoryWaiver): CategoryWaiver {
    const c = (r[key] ?? {}) as Record<string, unknown>;
    return {
      enabled:       typeof c.enabled === 'boolean' ? c.enabled : def.enabled,
      text:          typeof c.text === 'string' && c.text ? c.text : def.text,
      checkboxLabel: typeof c.checkboxLabel === 'string' && c.checkboxLabel ? c.checkboxLabel : def.checkboxLabel,
    };
  }
  return {
    tan: cat('tan', DEFAULT_WAIVERS.tan),
    wax: cat('wax', DEFAULT_WAIVERS.wax),
  };
}

export async function getWaiverConfig(): Promise<WaiverConfig> {
  if (global.__waiverCache) return global.__waiverCache;
  try {
    const { data, error } = await db.from('settings').select('value').eq('key', 'waivers').single();
    if (!error && data?.value) {
      global.__waiverCache = normalise(data.value);
      return global.__waiverCache;
    }
  } catch { /* fall through to defaults */ }
  global.__waiverCache = structuredClone(DEFAULT_WAIVERS);
  return global.__waiverCache;
}

export async function saveWaiverConfig(config: WaiverConfig): Promise<boolean> {
  global.__waiverCache = config;
  try {
    const { error } = await db.from('settings').upsert({
      key: 'waivers',
      value: config,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch { return false; }
}
