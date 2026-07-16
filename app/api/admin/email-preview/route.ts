/**
 * GET — render an email template with sample data, for design review.
 * ?type=confirmation | owner | noshow-fee    (default: confirmation)
 * ?send=1 additionally emails it to the logged-in owner via Resend.
 */

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { buildPreviewEmail, sendRawEmail } from '@/lib/notifications';
import type { Appointment } from '@/lib/admin-mock';

const SAMPLE: Appointment = {
  id: 'preview', date: '2026-07-24', startTime: '14:30', endTime: '15:10',
  staff: 'eric', clientName: 'Jordan Rivera', clientEmail: 'jordan@example.com',
  clientPhone: '778 555 0123', service: 'Haircut + Beard', durationMinutes: 60,
  price: 60, status: 'confirmed', manageToken: 'preview',
  payment: { paymentId: 'preview', amountCents: 6300, currency: 'CAD', status: 'COMPLETED', prepaid: true, gstCents: 300 },
} as Appointment;

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const type = (req.nextUrl.searchParams.get('type') ?? 'confirmation') as
    'confirmation' | 'owner' | 'noshow-fee';
  const html = buildPreviewEmail(type, SAMPLE);

  if (req.nextUrl.searchParams.get('send') === '1') {
    await sendRawEmail(
      process.env.OWNER_EMAIL ?? '',
      `[Design preview] ${type} email`,
      html,
    );
  }

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
