import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { SESSION_COOKIE } from '@/lib/admin-auth';

function secret(): Uint8Array {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error('ADMIN_SESSION_SECRET is not set');
  return new TextEncoder().encode(s);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Login page is always accessible
  if (pathname === '/admin/login') return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  try {
    await jwtVerify(token, secret());
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL('/admin/login', request.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }
}

export const config = {
  matcher: ['/admin/:path*'],
};
