/**
 * GET — render an email exactly as it would be sent, for design review.
 *
 * ?type=<kind>   one of EMAIL_KINDS (no type → an index of all of them)
 * ?name=…        override the client name, to check escaping of typed fields
 * ?send=1        also email it to the owner via Resend
 *
 * These come from buildEmail — the same function the senders use — so what you
 * see here is what a client receives, byte for byte. The previous version
 * re-implemented three of the templates and had already drifted from the real
 * ones, which meant copy could be approved here and never reach anybody.
 */

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { buildEmail, sendRawEmail, EMAIL_KINDS } from '@/lib/notifications';
import type { EmailKind } from '@/lib/notifications';
import type { Appointment } from '@/lib/admin-mock';

const SAMPLE: Appointment = {
  id: 'preview', date: '2026-07-24', startTime: '14:30', endTime: '15:30',
  staff: 'eric', clientName: 'Jordan Rivera', clientEmail: 'jordan@example.com',
  clientPhone: '778 555 0123', service: 'Haircut + Beard', durationMinutes: 60,
  price: 60, status: 'confirmed', manageToken: 'preview-token',
  payment: { paymentId: 'preview', amountCents: 6300, currency: 'CAD', status: 'COMPLETED', prepaid: true, gstCents: 300 },
} as Appointment;

// Enough for the templates that take extras; ignored by the ones that don't.
const EXTRAS = { note: 'Niamh is unwell — so sorry!', amountCents: 3750, last4: '5858' };

function indexPage(): string {
  const rows = EMAIL_KINDS.map(({ kind, label, when }) => `
    <tr>
      <td style="padding:11px 16px 11px 0;border-bottom:1px solid #e5e0d5;">
        <a href="?type=${kind}" style="font-size:15px;color:#141210;">${label}</a>
      </td>
      <td style="padding:11px 0;border-bottom:1px solid #e5e0d5;font-size:13px;color:#6b655c;">${when}</td>
    </tr>`).join('');
  return `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
  <body style="margin:0;padding:32px 20px;background:#faf8f4;color:#141210;font-family:-apple-system,BlinkMacSystemFont,'Inter Tight',sans-serif;">
    <div style="max-width:640px;margin:0 auto;">
      <h1 style="font-size:20px;font-weight:500;margin:0 0 4px;">Email previews</h1>
      <p style="font-size:13px;color:#6b655c;margin:0 0 24px;">
        Rendered from the same builder the senders use — this is what actually goes out.
      </p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
    </div>
  </body>`;
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const raw = req.nextUrl.searchParams.get('type');
  if (!raw) {
    return new Response(indexPage(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const kind = EMAIL_KINDS.find((k) => k.kind === raw)?.kind as EmailKind | undefined;
  if (!kind) {
    return Response.json(
      { error: 'Unknown type', valid: EMAIL_KINDS.map((k) => k.kind) },
      { status: 400 },
    );
  }

  const name = req.nextUrl.searchParams.get('name');
  const apt  = name ? { ...SAMPLE, clientName: name } : SAMPLE;
  const { subject, html } = buildEmail(kind, apt, EXTRAS);

  if (req.nextUrl.searchParams.get('send') === '1') {
    await sendRawEmail(process.env.OWNER_EMAIL ?? '', `[Preview] ${subject}`, html);
  }

  // Show the subject line too — it's half of what a client sees in their inbox,
  // and it was never reviewable before.
  const banner = `<div style="padding:10px 16px;background:#141210;color:#efeae0;
    font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;">
    <a href="?" style="color:#93b31c;text-decoration:none;">&larr; all emails</a>
    &nbsp;&nbsp;<strong>Subject:</strong> ${subject.replace(/</g, '&lt;')}</div>`;

  return new Response(banner + html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
