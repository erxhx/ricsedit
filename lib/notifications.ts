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

function firstName(fullName: string): string {
  return fullName.split(' ')[0] ?? fullName;
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

function aptDetailsHtml(apt: Appointment): string {
  const rows: [string, string][] = [
    ['Service', apt.service],
    ['Date',    formatDate(apt.date)],
    ['Time',    formatTime(apt.startTime)],
    ['With',    staffName(apt.staff)],
    ['Total',   `$${apt.price}`],
  ];
  const rowHtml = rows.map(([label, value], i) => `
    <tr style="background:${i % 2 === 0 ? '#f7f3eb' : '#efeae0'};">
      <td style="padding:${i === 0 ? '16px' : '12px'} 20px ${i === rows.length - 1 ? '16px' : '12px'};font-family:'Inter Tight',Helvetica,sans-serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#7a7268;">${label}</td>
      <td style="padding:${i === 0 ? '16px' : '12px'} 20px ${i === rows.length - 1 ? '16px' : '12px'};font-family:'Inter Tight',Helvetica,sans-serif;font-size:14px;color:#141210;text-align:right;">${value}</td>
    </tr>`).join('');

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dbd5c8;border-radius:8px;overflow:hidden;margin:24px 0;">
      ${rowHtml}
    </table>`;
}

function emailLayout(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Edit Studio</title>
</head>
<body style="margin:0;padding:0;background:#efeae0;font-family:'Inter Tight',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#efeae0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr>
          <td style="padding-bottom:24px;text-align:center;">
            <img src="https://www.editstudio.space/assets/logo-black.png" alt="Edit Studio" width="100" style="display:inline-block;height:auto;" />
          </td>
        </tr>
        <tr>
          <td style="background:#f7f3eb;border:1px solid #dbd5c8;border-radius:12px;padding:32px 28px;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding-top:24px;text-align:center;">
            <p style="font-family:'Inter Tight',Helvetica,sans-serif;font-size:11px;color:#7a7268;margin:0 0 4px;">
              Edit Studio · 1846 Oak Bay Avenue, Victoria BC
            </p>
            <p style="font-family:'Inter Tight',Helvetica,sans-serif;font-size:11px;color:#7a7268;margin:0;">
              <a href="tel:+17785353348" style="color:#7a7268;text-decoration:none;">778 535 3348</a>
              &nbsp;·&nbsp;
              <a href="https://www.editstudio.space" style="color:#7a7268;text-decoration:none;">editstudio.space</a>
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
  return `<a href="${href}" style="display:block;text-align:center;background:#141210;color:#efeae0;font-family:'Inter Tight',Helvetica,sans-serif;font-size:13px;font-weight:500;letter-spacing:0.04em;text-decoration:none;padding:14px 24px;border-radius:8px;margin-top:8px;">${text}</a>`;
}

function muted(text: string): string {
  return `<p style="margin:18px 0 0;font-family:'Inter Tight',Helvetica,sans-serif;font-size:12px;color:#7a7268;text-align:center;">${text}</p>`;
}

// ── Low-level send helpers ────────────────────────────────────────────────────

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
    <h1 style="margin:0 0 6px;font-family:'Inter Tight',Helvetica,sans-serif;font-size:22px;font-weight:600;color:#141210;letter-spacing:-0.02em;">You're booked in.</h1>
    <p style="margin:0 0 0;font-family:'Inter Tight',Helvetica,sans-serif;font-size:14px;color:#4a4540;">Hi ${firstName(apt.clientName)}, your appointment is confirmed.</p>
    ${aptDetailsHtml(apt)}
    ${ctaBtn('Manage your appointment →', url)}
    ${muted('Need to cancel or reschedule? Use the link above up to 3 hours before your appointment.')}
  `);

  const ownerHtml = emailLayout(`
    <h1 style="margin:0 0 6px;font-family:'Inter Tight',Helvetica,sans-serif;font-size:22px;font-weight:600;color:#141210;letter-spacing:-0.02em;">New booking</h1>
    <p style="margin:0;font-family:'Inter Tight',Helvetica,sans-serif;font-size:14px;color:#4a4540;">${apt.clientName} just booked.</p>
    ${aptDetailsHtml(apt)}
    ${apt.clientEmail ? `<p style="margin:8px 0 0;font-family:'Inter Tight',Helvetica,sans-serif;font-size:12px;color:#7a7268;">Email: <a href="mailto:${apt.clientEmail}" style="color:#9a9085;">${apt.clientEmail}</a></p>` : ''}
    ${apt.clientPhone ? `<p style="margin:4px 0 0;font-family:'Inter Tight',Helvetica,sans-serif;font-size:12px;color:#7a7268;">Phone: <a href="tel:${apt.clientPhone}" style="color:#9a9085;">${apt.clientPhone}</a></p>` : ''}
    ${apt.notes       ? `<p style="margin:4px 0 0;font-family:'Inter Tight',Helvetica,sans-serif;font-size:12px;color:#7a7268;">Notes: ${apt.notes}</p>` : ''}
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
    <h1 style="margin:0 0 6px;font-family:'Inter Tight',Helvetica,sans-serif;font-size:22px;font-weight:600;color:#141210;letter-spacing:-0.02em;">Appointment cancelled</h1>
    <p style="margin:0;font-family:'Inter Tight',Helvetica,sans-serif;font-size:14px;color:#4a4540;">
      ${isAdmin
        ? `Hi ${firstName(apt.clientName)}, we've had to cancel your upcoming appointment. We're sorry for any inconvenience.`
        : `Hi ${firstName(apt.clientName)}, your appointment has been cancelled.`}
    </p>
    ${aptDetailsHtml(apt)}
    ${isAdmin && note ? `<p style="margin:0 0 16px;font-family:'Inter Tight',Helvetica,sans-serif;font-size:14px;color:#4a4540;border-left:3px solid #dbd5c8;padding-left:12px;">${note}</p>` : ''}
    ${isAdmin
      ? `${muted('Please call or text us at <a href="tel:+17785353348" style="color:#7a7268;">778 535 3348</a> to rebook.')}
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
    <h1 style="margin:0 0 6px;font-family:'Inter Tight',Helvetica,sans-serif;font-size:22px;font-weight:600;color:#141210;letter-spacing:-0.02em;">We missed you.</h1>
    <p style="margin:0;font-family:'Inter Tight',Helvetica,sans-serif;font-size:14px;color:#4a4540;">Hi ${firstName(apt.clientName)}, we noticed you missed your appointment today — hope everything is okay!</p>
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
 * Sent when a booking is rescheduled.
 * → Client: updated details email + SMS with new date/time
 */
export async function sendRescheduleNotification(apt: Appointment): Promise<void> {
  const url = manageUrl(apt.manageToken);

  const clientHtml = emailLayout(`
    <h1 style="margin:0 0 6px;font-family:'Inter Tight',Helvetica,sans-serif;font-size:22px;font-weight:600;color:#141210;letter-spacing:-0.02em;">Appointment rescheduled</h1>
    <p style="margin:0;font-family:'Inter Tight',Helvetica,sans-serif;font-size:14px;color:#4a4540;">Hi ${firstName(apt.clientName)}, here are your updated details.</p>
    ${aptDetailsHtml(apt)}
    ${ctaBtn('Manage your appointment →', url)}
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
    <h1 style="margin:0 0 6px;font-family:'Inter Tight',Helvetica,sans-serif;font-size:22px;font-weight:600;color:#141210;letter-spacing:-0.02em;">We've upgraded our booking system.</h1>
    <p style="margin:0 0 0;font-family:'Inter Tight',Helvetica,sans-serif;font-size:14px;color:#4a4540;">Hi ${firstName(apt.clientName)}, we've made a few improvements to our booking platform behind the scenes. Your appointment is confirmed — your manage link below has been updated.</p>
    ${aptDetailsHtml(apt)}
    ${ctaBtn('Manage your appointment →', url)}
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
    <h1 style="margin:0 0 6px;font-family:'Inter Tight',Helvetica,sans-serif;font-size:22px;font-weight:600;color:#141210;letter-spacing:-0.02em;">See you tomorrow.</h1>
    <p style="margin:0;font-family:'Inter Tight',Helvetica,sans-serif;font-size:14px;color:#4a4540;">Hi ${firstName(apt.clientName)}, just a reminder about your appointment.</p>
    ${aptDetailsHtml(apt)}
    ${ctaBtn('Manage your appointment →', url)}
    ${muted('Need to cancel or reschedule? Please do so at least a few hours in advance.')}
  `);

  const clientSms =
    `Edit Studio: Reminder — ${apt.service} is tomorrow at ${formatTime(apt.startTime)}.\nManage: ${url}`;

  await Promise.all([
    sendEmail(apt.clientEmail, `Reminder: ${apt.service} tomorrow at ${formatTime(apt.startTime)}`, clientHtml),
    sendSms(apt.clientPhone, clientSms),
  ]);
}
