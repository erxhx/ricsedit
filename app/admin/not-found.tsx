/**
 * Admin 404 — covers an appointment id or client name that no longer resolves.
 *
 * Reached by tapping a stale push notification for a since-deleted booking, or
 * an old bookmark. Worth a real page rather than the framework default: the
 * admin runs as an installed PWA with no browser chrome, so a dead-end 404
 * leaves staff with no back button and nothing to tap.
 */

import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <div style={{
      minHeight: '70vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 18, padding: '0 24px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%', background: 'var(--admin-card)',
        border: '1px solid var(--admin-border)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 20,
        color: 'var(--admin-text3)',
      }}>
        ?
      </div>

      <div>
        <h1 style={{
          fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 400,
          color: 'var(--admin-text)', margin: '0 0 6px', letterSpacing: '-0.01em',
        }}>
          Not found
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)',
          margin: 0, lineHeight: 1.5, maxWidth: 280,
        }}>
          This appointment or client no longer exists — it may have been deleted
          since the link was made.
        </p>
      </div>

      <Link
        href="/admin"
        style={{
          padding: '11px 22px', borderRadius: 9999, background: 'var(--admin-text)',
          color: 'var(--admin-bg)', fontFamily: 'var(--font-body)', fontSize: 14,
          fontWeight: 500, textDecoration: 'none',
        }}
      >
        Back to today
      </Link>
    </div>
  );
}
