import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { AdminTheme } from '@/lib/admin-theme';

export async function POST(req: Request) {
  let theme: AdminTheme;
  try {
    const body = await req.json();
    theme = body.theme;
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (theme !== 'light' && theme !== 'dark') {
    return NextResponse.json({ error: 'Invalid theme' }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set('admin-theme', theme, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ ok: true });
}
