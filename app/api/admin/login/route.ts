import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { signSession, SESSION_COOKIE, SESSION_DAYS } from '@/lib/admin-auth';

function safeCompare(a: string, b: string): boolean {
  // Always compare fixed-length buffers to prevent length-based timing leaks
  const buf = Buffer.alloc(512);
  const bufA = Buffer.from(a.slice(0, 512));
  const bufB = Buffer.from(b.slice(0, 512));
  bufA.copy(buf); const refA = Buffer.from(buf);
  bufB.copy(buf); const refB = Buffer.from(buf);
  return timingSafeEqual(refA, refB) && a.length === b.length;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password: string = typeof body.password === 'string' ? body.password : '';

  const ericPass = process.env.ADMIN_PASSWORD_ERIC ?? '';
  const liviPass = process.env.ADMIN_PASSWORD_LIVI ?? '';

  let session = null;
  if (ericPass && safeCompare(password, ericPass)) {
    session = { sub: 'eric' as const, name: 'Eric', role: 'owner' as const };
  } else if (liviPass && safeCompare(password, liviPass)) {
    session = { sub: 'livi' as const, name: 'Livi', role: 'esti' as const };
  }

  if (!session) {
    await new Promise((r) => setTimeout(r, 500)); // slow brute-force
    return NextResponse.json({ error: 'Incorrect passphrase' }, { status: 401 });
  }

  const token = await signSession(session);
  const res = NextResponse.json({ ok: true, name: session.name });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: '/',
  });
  return res;
}
