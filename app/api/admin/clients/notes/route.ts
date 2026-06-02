import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { dbGetClientNotes, dbSaveClientNotes } from '@/lib/db';

async function auth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

export async function GET(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const phone = req.nextUrl.searchParams.get('phone') ?? '';
  const notes = await dbGetClientNotes(phone);
  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { phone, notes } = await req.json() as { phone: string; notes: string };
  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });
  await dbSaveClientNotes(phone, notes ?? '');
  return NextResponse.json({ ok: true });
}
