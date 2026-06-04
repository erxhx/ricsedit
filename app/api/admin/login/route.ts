import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { signSession, SESSION_COOKIE, SESSION_DAYS } from '@/lib/admin-auth';

// ── In-process rate limiter ───────────────────────────────────────────────────
// Persists within a warm Vercel function instance — resets on cold start.
// Good first line of defence; pair with a strong passphrase for full protection.

const WINDOW_MS  = 15 * 60 * 1000; // 15 minutes
const MAX_FAILS  = 8;               // lockout after 8 failures in the window

const failMap = new Map<string, { count: number; resetAt: number }>();

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function isRateLimited(ip: string): boolean {
  const now  = Date.now();
  const entry = failMap.get(ip);
  if (!entry || entry.resetAt < now) return false;
  return entry.count >= MAX_FAILS;
}

function recordFailure(ip: string): void {
  const now  = Date.now();
  const entry = failMap.get(ip);
  if (!entry || entry.resetAt < now) {
    failMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count++;
  }
  // Prune old entries to prevent unbounded memory growth
  if (failMap.size > 500) {
    for (const [k, v] of failMap) {
      if (v.resetAt < now) failMap.delete(k);
    }
  }
}

function clearFailures(ip: string): void {
  failMap.delete(ip);
}

// ── Timing-safe password comparison ──────────────────────────────────────────

function safeCompare(a: string, b: string): boolean {
  const buf = Buffer.alloc(512);
  const bufA = Buffer.from(a.slice(0, 512));
  const bufB = Buffer.from(b.slice(0, 512));
  bufA.copy(buf); const refA = Buffer.from(buf);
  bufB.copy(buf); const refB = Buffer.from(buf);
  return timingSafeEqual(refA, refB) && a.length === b.length;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  if (isRateLimited(ip)) {
    await new Promise(r => setTimeout(r, 500));
    return NextResponse.json(
      { error: 'Too many attempts — try again in 15 minutes' },
      { status: 429 },
    );
  }

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
    recordFailure(ip);
    await new Promise(r => setTimeout(r, 500)); // constant-time delay
    return NextResponse.json({ error: 'Incorrect passphrase' }, { status: 401 });
  }

  clearFailures(ip); // reset on success
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
