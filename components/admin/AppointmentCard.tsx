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
      background: '#161513',
      border: '1px solid #252320',
      borderRadius: 10,
      padding: '14px 16px',
      gap: 12,
      textDecoration: 'none',
      WebkitTapHighlightColor: 'transparent',
    }}>
      {/* Time column */}
      <div style={{ minWidth: 52, paddingTop: 1 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500, color: '#ece9e2', letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
          {fmtTime(apt.startTime)}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#4a4844', marginTop: 3 }}>
          {apt.durationMinutes} min
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 400, color: '#ece9e2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {apt.clientName}
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#6b6760', whiteSpace: 'nowrap' }}>
            ${apt.price}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#7a7570', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
            {apt.service}
          </div>
          {apt.notes && (
            <div style={{
              flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 3,
              background: '#2a2318', border: '1px solid #3a3020',
              borderRadius: 4, padding: '1px 5px',
            }}>
              <span style={{ fontSize: 9, color: '#b5824a', lineHeight: 1 }}>≡</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: '#8a6a3a', letterSpacing: '0.04em' }}>note</span>
            </div>
          )}
        </div>
      </div>

      {/* Staff dot + chevron */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, marginTop: 4 }} />
        <span style={{ fontSize: 10, color: '#3a3835', lineHeight: 1 }}>›</span>
      </div>
    </Link>
  );
}
