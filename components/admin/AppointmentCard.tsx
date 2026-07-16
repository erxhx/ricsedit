import Link from 'next/link';
import type { Appointment } from '@/lib/admin-mock';
import { getAppointmentColor } from '@/lib/appointment-colors';

function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr}:${String(m).padStart(2, '0')} ${period}`;
}

export default function AppointmentCard({ apt }: { apt: Appointment }) {
  const color = getAppointmentColor(apt.staff, apt.service);
  return (
    <Link href={`/admin/appointments/${apt.id}`} style={{
      display: 'flex',
      background: 'var(--admin-card)',
      border: '1px solid var(--admin-border)',
      borderLeft: `3px solid ${color}`,
      borderRadius: 12,
      boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
      padding: '14px 16px',
      gap: 12,
      textDecoration: 'none',
      WebkitTapHighlightColor: 'transparent',
    }}>
      {/* Time column — same visual weight as client name for easy scanning */}
      <div style={{ minWidth: 58, paddingTop: 1, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: 'var(--admin-text)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
          {fmtTime(apt.startTime)}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)', marginTop: 3 }}>
          {apt.durationMinutes} min
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: 'var(--admin-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {apt.clientName}
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text3)', whiteSpace: 'nowrap' }}>
            ${apt.price}
          </span>
          {apt.payment?.prepaid && !apt.payment.refunded && (
            <span style={{
              flexShrink: 0, alignSelf: 'center',
              fontFamily: 'var(--font-body)', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.08em',
              color: '#2e7d4f', background: 'rgba(52,199,89,0.14)',
              border: '1px solid rgba(52,199,89,0.35)',
              borderRadius: 4, padding: '2px 5px', lineHeight: 1,
            }}>
              PAID
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
            {apt.service}
          </div>
          {apt.notes && (
            <div style={{
              flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 3,
              background: 'var(--admin-note)', border: '1px solid var(--admin-note-border)',
              borderRadius: 4, padding: '1px 5px',
            }}>
              <span style={{ fontSize: 9, color: '#b5824a', lineHeight: 1 }}>≡</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-text3)', letterSpacing: '0.04em' }}>note</span>
            </div>
          )}
        </div>
      </div>

      {/* Chevron */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, paddingLeft: 4 }}>
        <span style={{ fontSize: 18, color: 'var(--admin-text3)', lineHeight: 1 }}>›</span>
      </div>
    </Link>
  );
}
