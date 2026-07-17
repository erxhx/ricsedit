/**
 * Client-facing notifications — email via Resend, SMS via Twilio.
 *
 * All functions are fire-and-forget safe: they catch their own errors so a
 * notification failure never breaks the booking response.
 *
 * Required env vars:
 *   RESEND_API_KEY          — from resend.com
 *   RESEND_FROM_EMAIL       — verified sender, e.g. "Edit Studio <bookings@editstudio.space>"
 *   TWILIO_ACCOUNT_SID      — from console.twilio.com
 *   TWILIO_AUTH_TOKEN       — from console.twilio.com
 *   TWILIO_PHONE_NUMBER     — your Twilio number, e.g. +12505551234
 *   OWNER_EMAIL             — studio owner's email for new-booking alerts
 *   OWNER_PHONE             — studio owner's phone for new-booking SMS alerts (optional)
 *   NEXT_PUBLIC_SITE_URL    — base URL of this Next.js app, e.g. https://book.editstudio.space
 */

import { Resend } from 'resend';
import twilio from 'twilio';
import type { Appointment } from './admin-mock';
import { staffName } from './staff';

// ── Config ────────────────────────────────────────────────────────────────────

const resendClient = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? 'Edit Studio <bookings@editstudio.space>';
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER ?? '';
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? '';
const OWNER_PHONE = process.env.OWNER_PHONE ?? '';

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.editstudio.space').replace(/\/$/, '');
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  // "2024-03-15" → "Friday, March 15"
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function formatTime(timeStr: string): string {
  // "14:30" → "2:30 pm"
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const hour   = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Escape client-typed strings before HTML interpolation. Booking names,
 * notes, etc. are attacker-controlled: without this, someone booking as
 * "<a href=…>" gets live markup rendered in the OWNER's notification email.
 */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** First name, HTML-escaped — every call site interpolates into HTML. */
function firstName(fullName: string): string {
  return esc(fullName.split(' ')[0] ?? fullName);
}

function manageUrl(token: string): string {
  return `${siteUrl()}/booking/manage/${token}`;
}

function toE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  const e164 = digits.startsWith('1') ? `+${digits}` : `+1${digits}`;
  return e164.length >= 11 ? e164 : null;
}

// ── Email primitives ──────────────────────────────────────────────────────────

// ── Email design system ───────────────────────────────────────────────────────
// Editorial ink-on-paper, matching the site: mono uppercase eyebrows with the
// lime dot, serif italic headlines ("Looks good?" voice), hairline-ruled
// detail rows, solid-ink CTA. Dark-mode strategy: the header band is ALREADY
// ink (#141210) with a paper logo, so Gmail's forced dark transform leaves it
// alone (dark stays dark) — the logo can never vanish again. The rest is a
// flat paper surface that inverts gracefully.

const FONT_BODY = `'Inter Tight',Helvetica,Arial,sans-serif`;
const FONT_MONO = `'SF Mono','Courier New',monospace`;
const FONT_DISPLAY = `Georgia,'Times New Roman',serif`;

/** Mono uppercase kicker with the lime dot — one per email, above the h1. */
/** Compose a full email for the admin preview endpoint (and tests). */
export function buildPreviewEmail(kind: 'confirmation' | 'owner' | 'noshow-fee', apt: Appointment): string {
  if (kind === 'owner') {
    return emailLayout(`
      ${eyebrow('New booking')}
      ${h1(`${firstName(apt.clientName)} just booked.`)}
      ${para(esc(apt.clientName) + (apt.payment?.prepaid ? ' — paid in full online.' : ''))}
      ${aptDetailsHtml(apt)}
      <p style="margin:8px 0 0;font-family:${FONT_BODY};font-size:13px;color:#5f594f;">Email: <a href="mailto:${esc(apt.clientEmail)}" style="color:#5f594f;">${esc(apt.clientEmail)}</a></p>
      <p style="margin:4px 0 0;font-family:${FONT_BODY};font-size:13px;color:#5f594f;">Phone: <a href="tel:${esc(apt.clientPhone)}" style="color:#5f594f;">${esc(apt.clientPhone)}</a></p>
    `);
  }
  if (kind === 'noshow-fee') {
    return emailLayout(`
      ${eyebrow('Payment notice')}
      ${h1('No-show fee charged.')}
      ${para(`Hi ${firstName(apt.clientName)}, as per our cancellation policy, a no-show fee of <strong>$40.00</strong> was charged to your card on file ending in 5858 for the missed appointment below.`)}
      ${aptDetailsHtml(apt)}
      ${muted('Think this was a mistake? Call or text us at 778 535 3348 and we’ll sort it out.')}
      ${ctaBtn('Rebook Online', 'https://www.editstudio.space')}
    `);
  }
  return emailLayout(`
    ${eyebrow('Booking confirmed')}
    ${h1(`You're booked in.`)}
    ${para(`Hi ${firstName(apt.clientName)}, your appointment is confirmed. We'll see you soon.`)}
    ${aptDetailsHtml(apt)}
    ${ctaBtn('Manage appointment', 'https://www.editstudio.space')}
    ${muted('Need to cancel or reschedule? Use the link above up to 3 hours before your appointment.')}
  `);
}

function eyebrow(text: string): string {
  return `<p class="es-soft" style="margin:0 0 14px;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#5f594f;">
    <span style="color:#93b31c;">&#9679;</span>&nbsp;&nbsp;${text}</p>`;
}

/** Serif italic headline — the site's "Looks good?" voice. */
function h1(text: string): string {
  return `<h1 class="es-ink" style="margin:0 0 10px;font-family:${FONT_DISPLAY};font-style:italic;font-weight:400;font-size:30px;line-height:1.1;color:#141210;letter-spacing:-0.01em;">${text}</h1>`;
}

function para(text: string): string {
  return `<p class="es-body" style="margin:0;font-family:${FONT_BODY};font-size:16px;line-height:1.6;color:#2e2a26;">${text}</p>`;
}

function aptDetailsHtml(apt: Appointment): string {
  const rows: [string, string][] = [
    ['Service', apt.service],
    ['Date',    formatDate(apt.date)],
    ['Time',    formatTime(apt.startTime)],
    ['With',    staffName(apt.staff)],
    ['Total',   `$${apt.price}`],
  ];
  const last = rows.length - 1;
  const rowHtml = rows.map(([label, value], i) => {
    const bordCls = i === 0 || i === last ? 'es-bord-ink' : 'es-rule';
    const bordCol = i === 0 || i === last ? '#141210' : '#dbd5c8';
    return `
    <tr>
      <td class="es-soft ${bordCls}" style="padding:13px 2px;border-top:1px solid ${bordCol};font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5f594f;white-space:nowrap;">${label}</td>
      <td class="es-ink ${bordCls}" style="padding:13px 2px;border-top:1px solid ${bordCol};font-family:${FONT_BODY};font-size:${i === last ? 18 : 16}px;${i === last ? 'font-weight:600;' : ''}color:#141210;text-align:right;">${esc(value)}</td>
    </tr>`;
  }).join('');

  return `
    <table width="100%" cellpadding="0" cellspacing="0" class="es-bord-ink" style="margin:26px 0 24px;border-bottom:1px solid #141210;">
      ${rowHtml}
    </table>`;
}

function emailLayout(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Edit Studio</title>
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    @media (prefers-color-scheme: dark) {
      .es-paper    { background:#1c1a17 !important; }
      .es-ink      { color:#f0ece3 !important; }
      .es-body     { color:#ddd7cc !important; }
      .es-soft     { color:#c0b9ad !important; }
      .es-rule     { border-color:#3d3831 !important; }
      .es-bord-ink { border-color:#f0ece3 !important; }
    }
  </style>
</head>
<body class="es-paper" style="margin:0;padding:0;background:#f7f3eb;font-family:${FONT_BODY};">
  <table width="100%" cellpadding="0" cellspacing="0" class="es-paper" style="background:#f7f3eb;">
    <tr><td align="center" style="padding:28px 16px 44px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr>
          <td style="background:#141210;border-radius:14px;padding:22px 26px;text-align:center;">
            <!-- CSS band + white logo. Known trade-off: Gmail dark mode
                 inverts the band to cream, softening the logo — accepted
                 over a baked-image header, whose remote fetch can fail and
                 render a broken-image box (worse). -->
            <img src="https://www.editstudio.space/assets/logo-white.png" alt="Edit Studio" width="86" style="display:inline-block;height:auto;" />
          </td>
        </tr>
        <tr>
          <td class="es-card" style="padding:34px 26px 8px;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td class="es-rule" style="padding:22px 26px 0;border-top:1px solid #dbd5c8;">
            <p class="es-soft" style="font-family:${FONT_MONO};font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#5f594f;margin:0 0 5px;text-align:center;">
              Edit Studio &nbsp;&middot;&nbsp; 1846 Oak Bay Avenue, Victoria BC
            </p>
            <p class="es-soft" style="font-family:${FONT_MONO};font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#5f594f;margin:0;text-align:center;">
              <a href="tel:+17785353348" class="es-soft" style="color:#5f594f;text-decoration:none;">778 535 3348</a>
              &nbsp;&middot;&nbsp;
              <a href="https://www.editstudio.space" class="es-soft" style="color:#5f594f;text-decoration:none;">editstudio.space</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaBtn(text: string, href: string): string {
  return `<a href="${href}" style="display:block;text-align:center;background:#141210;color:#f7f3eb;font-family:${FONT_MONO};font-size:13px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;padding:16px 24px;border-radius:999px;margin-top:10px;">${text}</a>`;
}

function muted(text: string): string {
  return `<p class="es-soft" style="margin:18px 0 0;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:#5f594f;text-align:center;">${text}</p>`;
}

// ── Low-level send helpers ────────────────────────────────────────────────────

/** Exported for the admin email-preview endpoint. */
export async function sendRawEmail(to: string, subject: string, html: string): Promise<void> {
  return sendEmail(to, subject, html);
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!resendClient || !to?.includes('@')) return;
  try {
    await resendClient.emails.send({ from: FROM_EMAIL, to, subject, html });
  } catch (err) {
    console.error('[notifications] email send error', err);
  }
}

async function sendSms(to: string, body: string): Promise<void> {
  if (!twilioClient || !TWILIO_FROM) return;
  const e164 = toE164(to);
  if (!e164) return;
  try {
    await twilioClient.messages.create({ from: TWILIO_FROM, to: e164, body });
  } catch (err) {
    console.error('[notifications] SMS send error', err);
  }
}

// ── Public notification functions ─────────────────────────────────────────────

/**
 * Sent immediately when a booking is created.
 * → Client: confirmation email + SMS
 * → Owner: new-booking alert email (+ optional SMS)
 */
export async function sendBookingConfirmation(apt: Appointment): Promise<void> {
  const url = manageUrl(apt.manageToken);

  const clientHtml = emailLayout(`
    ${eyebrow('Booking confirmed')}
    ${h1(`You're booked in.`)}
    ${para(`Hi ${firstName(apt.clientName)}, your appointment is confirmed. We'll see you soon.`)}
    ${aptDetailsHtml(apt)}
    ${ctaBtn('Manage appointment', url)}
    ${muted('Need to cancel or reschedule? Use the link above up to 3 hours before your appointment.')}
  `);

  const ownerHtml = emailLayout(`
    ${eyebrow('New booking')}
    ${h1(`${firstName(apt.clientName)} just booked.`)}
    ${para(esc(apt.clientName) + (apt.payment?.prepaid ? ' — paid in full online.' : apt.payment?.amountCents ? ' — deposit paid online.' : ''))}
    ${aptDetailsHtml(apt)}
    ${apt.clientEmail ? `<p style="margin:8px 0 0;font-family:${FONT_BODY};font-size:13px;color:#5f594f;">Email: <a href="mailto:${esc(apt.clientEmail)}" style="color:#5f594f;">${esc(apt.clientEmail)}</a></p>` : ''}
    ${apt.clientPhone ? `<p style="margin:4px 0 0;font-family:${FONT_BODY};font-size:13px;color:#5f594f;">Phone: <a href="tel:${esc(apt.clientPhone)}" style="color:#5f594f;">${esc(apt.clientPhone)}</a></p>` : ''}
    ${apt.notes       ? `<p style="margin:4px 0 0;font-family:${FONT_BODY};font-size:13px;color:#5f594f;">Notes: ${esc(apt.notes)}</p>` : ''}
  `);

  const clientSms =
    `Edit Studio: You're booked!\n${apt.service} · ${formatDate(apt.date)} at ${formatTime(apt.startTime)}\nManage: ${url}`;

  const ownerSms =
    `New booking: ${apt.clientName} · ${apt.service} · ${formatDate(apt.date)} at ${formatTime(apt.startTime)}`;

  await Promise.all([
    sendEmail(apt.clientEmail, `Booking confirmed — ${apt.service}`, clientHtml),
    sendSms(apt.clientPhone, clientSms),
    sendEmail(OWNER_EMAIL, `New booking · ${apt.clientName} · ${formatDate(apt.date)} ${formatTime(apt.startTime)}`, ownerHtml),
    OWNER_PHONE ? sendSms(OWNER_PHONE, ownerSms) : Promise.resolve(),
  ]);
}

/**
 * Sent when a booking is cancelled.
 * cancelledBy 'client' → self-cancellation tone
 * cancelledBy 'admin'  → studio-initiated tone with apology + contact info
 */
export async function sendCancellationNotification(
  apt: Appointment,
  cancelledBy: 'client' | 'admin' = 'client',
  note?: string,
): Promise<void> {
  const isAdmin = cancelledBy === 'admin';

  const clientHtml = emailLayout(`
    ${eyebrow('Cancellation')}
    ${h1('Appointment cancelled.')}
    ${para(isAdmin
        ? `Hi ${firstName(apt.clientName)}, we've had to cancel your upcoming appointment. We're sorry for any inconvenience.`
        : `Hi ${firstName(apt.clientName)}, your appointment has been cancelled.`)}
    ${aptDetailsHtml(apt)}
    ${isAdmin && note ? `<p class="es-body" style="margin:0 0 16px;font-family:${FONT_BODY};font-size:15px;line-height:1.6;color:#2e2a26;border-left:3px solid #dbd5c8;padding-left:12px;">${esc(note)}</p>` : ''}
    ${isAdmin
      ? `${muted('Please call or text us at <a href="tel:+17785353348" style="color:#5f594f;">778 535 3348</a> to rebook.')}
         ${ctaBtn('Book Online', 'https://www.editstudio.space')}`
      : `${ctaBtn('Book Again', 'https://www.editstudio.space')}
         ${muted('Questions? Call or text us at 778 535 3348.')}`}
  `);

  const clientSms = isAdmin
    ? `Edit Studio: We've had to cancel your ${apt.service} on ${formatDate(apt.date)}.${note ? ` ${note}` : ''} Sorry for the inconvenience — call us at 778 535 3348 or rebook at editstudio.space`
    : `Edit Studio: Your ${apt.service} on ${formatDate(apt.date)} has been cancelled. Book again at editstudio.space`;

  await Promise.all([
    sendEmail(apt.clientEmail, `Appointment cancelled — ${apt.service}`, clientHtml),
    sendSms(apt.clientPhone, clientSms),
  ]);
}

/**
 * Sent when a client is marked no-show.
 * → Client: friendly "we missed you" email + SMS with rebook link
 */
export async function sendNoShowNotification(
  apt: Appointment,
  { sms = false }: { sms?: boolean } = {},
): Promise<void> {
  const clientHtml = emailLayout(`
    ${eyebrow('Missed appointment')}
    ${h1('We missed you.')}
    ${para(`Hi ${firstName(apt.clientName)}, we noticed you missed your appointment today — hope everything is okay!`)}
    ${aptDetailsHtml(apt)}
    ${ctaBtn('Rebook Online', 'https://www.editstudio.space')}
    ${muted('Questions? Call or text us at 778 535 3348.')}
  `);

  const promises: Promise<void>[] = [
    sendEmail(apt.clientEmail, `We missed you — ${apt.service}`, clientHtml),
  ];

  if (sms) {
    promises.push(sendSms(
      apt.clientPhone,
      `Edit Studio: We missed you for your ${apt.service} today at ${formatTime(apt.startTime)}. Hope all is well — rebook anytime at editstudio.space`,
    ));
  }

  await Promise.all(promises);
}

/**
 * Sent when a no-show fee is charged to the card on file — card networks (and
 * basic decency) require telling the client about a merchant-initiated charge.
 */
export async function sendNoShowFeeNotification(
  apt: Appointment,
  amountCents: number,
  last4?: string,
): Promise<void> {
  const amount = `$${(amountCents / 100).toFixed(2)}`;
  const cardText = last4 ? ` ending in ${last4}` : '';

  const clientHtml = emailLayout(`
    ${eyebrow('Payment notice')}
    ${h1('No-show fee charged.')}
    ${para(`Hi ${firstName(apt.clientName)}, as per our cancellation policy, a no-show fee of <strong>${amount}</strong> was charged to your card on file${cardText} for the missed appointment below.`)}
    ${aptDetailsHtml(apt)}
    ${muted('Think this was a mistake? Call or text us at 778 535 3348 and we’ll sort it out.')}
    ${ctaBtn('Rebook Online', 'https://www.editstudio.space')}
  `);

  await sendEmail(apt.clientEmail, `No-show fee — ${apt.service}`, clientHtml);
}

/**
 * Sent when a booking is rescheduled.
 * → Client: updated details email + SMS with new date/time
 */
export async function sendRescheduleNotification(apt: Appointment): Promise<void> {
  const url = manageUrl(apt.manageToken);

  const clientHtml = emailLayout(`
    ${eyebrow('Updated booking')}
    ${h1('Appointment rescheduled.')}
    ${para(`Hi ${firstName(apt.clientName)}, here are your updated details.`)}
    ${aptDetailsHtml(apt)}
    ${ctaBtn('Manage appointment', url)}
    ${muted('Questions? Call or text us at 778 535 3348.')}
  `);

  const clientSms =
    `Edit Studio: Rescheduled!\n${apt.service} is now on ${formatDate(apt.date)} at ${formatTime(apt.startTime)}\nManage: ${url}`;

  await Promise.all([
    sendEmail(apt.clientEmail, `Appointment rescheduled — ${formatDate(apt.date)} at ${formatTime(apt.startTime)}`, clientHtml),
    sendSms(apt.clientPhone, clientSms),
  ]);
}

/**
 * One-time migration email sent when importing clients from a previous booking system.
 * → Client: "we've upgraded" notice with their confirmed appointment details + new manage link
 */
export async function sendMigrationNotification(apt: Appointment): Promise<void> {
  const url = manageUrl(apt.manageToken);

  const clientHtml = emailLayout(`
    ${eyebrow('Studio news')}
    ${h1(`We've upgraded our booking system.`)}
    ${para(`Hi ${firstName(apt.clientName)}, we've made a few improvements to our booking platform behind the scenes. Your appointment is confirmed — your manage link below has been updated.`)}
    ${aptDetailsHtml(apt)}
    ${ctaBtn('Manage appointment', url)}
    ${muted('Use the link above to cancel or reschedule up to 3 hours before your appointment.')}
  `);

  await sendEmail(
    apt.clientEmail,
    `Your Edit Studio appointment — updated booking link`,
    clientHtml,
  );
}

/**
 * Sent the day before an appointment (called by the /api/cron/reminders endpoint).
 * → Client: reminder email + SMS
 */
export async function sendReminderNotification(apt: Appointment): Promise<void> {
  const url = manageUrl(apt.manageToken);

  const clientHtml = emailLayout(`
    ${eyebrow('Appointment reminder')}
    ${h1('See you tomorrow.')}
    ${para(`Hi ${firstName(apt.clientName)}, just a reminder about your appointment.`)}
    ${aptDetailsHtml(apt)}
    ${ctaBtn('Manage appointment', url)}
    ${muted('Need to cancel or reschedule? Please do so at least a few hours in advance.')}
  `);

  const clientSms =
    `Edit Studio: Reminder — ${apt.service} is tomorrow at ${formatTime(apt.startTime)}.\nManage: ${url}`;

  await Promise.all([
    sendEmail(apt.clientEmail, `Reminder: ${apt.service} tomorrow at ${formatTime(apt.startTime)}`, clientHtml),
    sendSms(apt.clientPhone, clientSms),
  ]);
}
