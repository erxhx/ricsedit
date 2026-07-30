/**
 * Shown when a manage link doesn't resolve to an appointment.
 *
 * The likeliest visitor is not someone poking at URLs — it's a client opening
 * an old confirmation email, months after the appointment, or after cancelling.
 * They get here by following a link we sent them, so the page owes them a way
 * forward rather than a bare 404. Same wording as the API returns for a dead
 * token, so a client reading it out over the phone matches what staff see.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Link no longer valid — Edit Studio',
  robots: 'noindex',
};

export default function ManageNotFound() {
  return (
    // Background and ink are set explicitly rather than inherited. The manage
    // page next door leaves both to the browser default, which happens to be
    // black-on-white — fine until a user agent decides otherwise, and this is
    // the one page someone lands on already mildly annoyed.
    <main
      className="min-h-screen px-6 py-12"
      style={{ background: '#ffffff', color: '#141210' }}
    >
      <div className="max-w-sm mx-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/logo-black.png"
          alt="Edit Studio"
          style={{ height: 69, width: 'auto', opacity: 0.7, display: 'block', margin: '0 auto 24px' }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: 'rgba(0,0,0,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>
            ?
          </div>

          <div>
            <h1 style={{
              fontFamily: 'var(--font-display, Georgia, serif)',
              fontSize: 26, fontWeight: 300, margin: '0 0 8px',
            }}>
              This link is no longer valid
            </h1>
            <p style={{ fontSize: 13, opacity: 0.5, margin: 0, lineHeight: 1.6 }}>
              It may have already been used, or the appointment may have passed. If you
              still need to change or cancel a booking, call or text us and we&rsquo;ll
              sort it out.
            </p>
          </div>

          <a
            href="tel:7785353348"
            style={{
              display: 'block', textAlign: 'center', padding: '14px 0', borderRadius: 9999,
              background: '#141210', color: '#efeae0', fontSize: 14, fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Call or text 778 535 3348
          </a>

          <a
            href="https://www.editstudio.space"
            style={{ fontSize: 13, opacity: 0.4, textDecoration: 'none', textAlign: 'center' }}
          >
            Book a new appointment →
          </a>
        </div>
      </div>
    </main>
  );
}
