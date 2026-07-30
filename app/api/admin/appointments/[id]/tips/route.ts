/**
 * Hand-logged tips on an appointment — cash, or a tip added at the POS terminal.
 *
 * POST   { amountCents, method, note? }  → adds an entry
 * DELETE ?tipId=…                        → removes one entry
 *
 * Both return the full updated list so the client never has to guess what the
 * server now holds.
 *
 * Permissions go through canLogTipFor: admins for anyone, everyone else only
 * for their own appointments. The check is on the appointment's staff, not on
 * whatever the caller sends, so there is nothing to spoof.
 */

import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { dbGetAppointmentById, dbSetManualTips } from '@/lib/db';
import { canLogTipFor } from '@/lib/staff';
import type { ManualTip } from '@/lib/admin-mock';

const MIN_CENTS = 1;        // 1c — a trivial tip is still a real one
const MAX_CENTS = 100000;   // $1000 — a typo guard, not a policy
const MAX_TIPS  = 20;       // per appointment; well past any real use

const MISSING_COLUMN =
  'Tip logging needs a one-time database change: add a `manual_tips` jsonb '
  + 'column to the appointments table. Nothing was saved.';

async function load(id: string, viewerId: string) {
  const apt = await dbGetAppointmentById(id);
  if (!apt) return { error: Response.json({ error: 'Not found' }, { status: 404 }) };
  if (!canLogTipFor(viewerId, apt.staff)) {
    return {
      error: Response.json(
        { error: 'You can only log tips on your own appointments.' },
        { status: 403 },
      ),
    };
  }
  return { apt };
}

async function auth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null) as
    { amountCents?: unknown; method?: unknown; note?: unknown } | null;

  const amountCents = body?.amountCents;
  if (typeof amountCents !== 'number' || !Number.isInteger(amountCents)
      || amountCents < MIN_CENTS || amountCents > MAX_CENTS) {
    return Response.json(
      { error: 'Enter a tip between $0.01 and $1,000.' },
      { status: 400 },
    );
  }
  const method = body?.method;
  if (method !== 'cash' && method !== 'card') {
    return Response.json({ error: 'Method must be cash or card.' }, { status: 400 });
  }
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 200) : '';

  const { apt, error } = await load(id, session.sub);
  if (error) return error;

  const existing = apt!.manualTips ?? [];
  if (existing.length >= MAX_TIPS) {
    return Response.json(
      { error: `That appointment already has ${MAX_TIPS} logged tips.` },
      { status: 409 },
    );
  }

  const entry: ManualTip = {
    id: randomUUID(),
    amountCents,
    method,
    at: new Date().toISOString(),
    byStaff: session.sub,
    ...(note ? { note } : {}),
  };

  const res = await dbSetManualTips(id, [...existing, entry]);
  if (!res.ok) {
    return res.reason === 'missing_column'
      ? Response.json({ error: MISSING_COLUMN }, { status: 501 })
      : Response.json({ error: 'Could not save the tip. Please try again.' }, { status: 500 });
  }
  return Response.json({ manualTips: res.apt.manualTips ?? [] });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const tipId = new URL(request.url).searchParams.get('tipId');
  if (!tipId) return Response.json({ error: 'Missing tipId' }, { status: 400 });

  const { apt, error } = await load(id, session.sub);
  if (error) return error;

  const existing = apt!.manualTips ?? [];
  const next = existing.filter((t) => t.id !== tipId);
  // Report a no-op rather than a success: if the id didn't match, the caller is
  // looking at a stale list and shouldn't be told the deletion worked.
  if (next.length === existing.length) {
    return Response.json({ error: 'That tip is no longer there.' }, { status: 404 });
  }

  const res = await dbSetManualTips(id, next);
  if (!res.ok) {
    return res.reason === 'missing_column'
      ? Response.json({ error: MISSING_COLUMN }, { status: 501 })
      : Response.json({ error: 'Could not remove the tip. Please try again.' }, { status: 500 });
  }
  return Response.json({ manualTips: res.apt.manualTips ?? [] });
}
