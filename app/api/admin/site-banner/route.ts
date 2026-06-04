import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { db } from '@/lib/supabase';

const KEY = 'site_banner';

export interface BannerConfig {
  enabled: boolean;
  text: string;
  target: 'barber' | 'tan' | 'wax';
  style: 'lime' | 'noir' | 'bone';
}

const DEFAULT: BannerConfig = {
  enabled: true,
  text: 'Late night bookings available until 9pm Thursdays',
  target: 'barber',
  style: 'lime',
};

async function auth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

async function load(): Promise<BannerConfig> {
  try {
    const { data } = await db.from('settings').select('value').eq('key', KEY).maybeSingle();
    if (data?.value && typeof data.value === 'object') {
      const v = data.value as Partial<BannerConfig>;
      return {
        enabled: typeof v.enabled === 'boolean' ? v.enabled : DEFAULT.enabled,
        text:    typeof v.text   === 'string'  ? v.text   : DEFAULT.text,
        target:  (['barber','tan','wax'] as const).includes(v.target as 'barber') ? v.target as BannerConfig['target'] : DEFAULT.target,
        style:   (['lime','noir','bone'] as const).includes(v.style as 'lime')   ? v.style  as BannerConfig['style']  : DEFAULT.style,
      };
    }
  } catch { /* fall through */ }
  return { ...DEFAULT };
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await load());
}

export async function POST(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json() as Partial<BannerConfig>;
  const config: BannerConfig = {
    enabled: typeof body.enabled === 'boolean' ? body.enabled : DEFAULT.enabled,
    text:    typeof body.text   === 'string'  ? body.text   : DEFAULT.text,
    target:  (['barber','tan','wax'] as const).includes(body.target as 'barber') ? body.target as BannerConfig['target'] : DEFAULT.target,
    style:   (['lime','noir','bone'] as const).includes(body.style as 'lime')   ? body.style  as BannerConfig['style']  : DEFAULT.style,
  };
  await db.from('settings').upsert({ key: KEY, value: config, updated_at: new Date().toISOString() });
  return NextResponse.json(config);
}
