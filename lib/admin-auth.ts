import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'es-admin-session';
export const SESSION_DAYS = 90;

export interface AdminSession {
  sub: 'eric' | 'livi';
  name: string;
  role: 'owner' | 'esti';
}

function secret(): Uint8Array {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error('ADMIN_SESSION_SECRET is not set');
  return new TextEncoder().encode(s);
}

export async function signSession(payload: AdminSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as AdminSession;
  } catch {
    return null;
  }
}
