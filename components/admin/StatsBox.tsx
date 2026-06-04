import type { Appointment } from '@/lib/admin-mock';
import { SERVICE_COLORS } from '@/lib/appointment-colors';

interface Props {
  appointments: Appointment[];
  /** Optional: working hours per day-of-week [open, close] for utilization calc */
  hoursByDay?: Record<number, [number, number] | null>;
  /** Date range for multi-day utilization (YYYY-MM-DD) */
  startDate?: string;
  endDate?: string;
}

function Stat({ label, value, color, sub, subColor }: {
  label: string; value: string; color?: string; sub?: string; subColor?: string;
}) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)',
        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500,
        color: color ?? 'var(--admin-text)',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 11,
          color: subColor ?? 'var(--admin-muted)', marginTop: 2,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function StatsBox({ appointments, hoursByDay, startDate, endDate }: Props) {
  const active   = appointments.filter(a => a.status !== 'cancelled' && a.status !== 'blocked');
  const ericApts = active.filter(a => a.staff === 'eric');
  const liviApts = active.filter(a => a.staff === 'livi');
  const total    = active.reduce((s, a) => s + a.price, 0);

  // Compute utilization across the date range using hoursByDay
  function utilization(staffApts: Appointment[]): { pct: number; color: string } | null {
    if (!hoursByDay || !startDate || !endDate) return null;

    // Sum total available working minutes across all days in range
    let totalMins = 0;
    const start = new Date(startDate + 'T12:00:00');
    const end   = new Date(endDate   + 'T12:00:00');
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const h = hoursByDay[d.getDay()];
      if (h) totalMins += (h[1] - h[0]) * 60;
    }
    if (totalMins <= 0) return null;

    const booked = staffApts.reduce((s, a) => s + a.durationMinutes, 0);
    const pct    = Math.round(booked / totalMins * 100);
    const color  = pct >= 80 ? '#4a9b6f' : pct >= 50 ? '#b5824a' : 'var(--admin-muted)';
    return { pct, color };
  }

  const ericUtil = utilization(ericApts);
  const liviUtil = utilization(liviApts);

  return (
    <div style={{
      display: 'flex', gap: 16,
      padding: '12px 16px',
      background: 'var(--admin-card)',
      border: '1px solid var(--admin-border)',
      borderRadius: 12,
      boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
    }}>
      <Stat label="Total" value={total > 0 ? `$${total}` : '—'} />
      <div style={{ width: 1, background: 'var(--admin-border)' }} />
      <Stat
        label="Eric"
        value={ericApts.length > 0 ? `${ericApts.length} apt${ericApts.length !== 1 ? 's' : ''}` : '—'}
        color={ericApts.length > 0 ? SERVICE_COLORS.ericBarber : undefined}
        sub={ericUtil ? `${ericUtil.pct}% booked` : undefined}
        subColor={ericUtil?.color}
      />
      <div style={{ width: 1, background: 'var(--admin-border)' }} />
      <Stat
        label="Livi"
        value={liviApts.length > 0 ? `${liviApts.length} apt${liviApts.length !== 1 ? 's' : ''}` : '—'}
        color={liviApts.length > 0 ? SERVICE_COLORS.liviWax : undefined}
        sub={liviUtil ? `${liviUtil.pct}% booked` : undefined}
        subColor={liviUtil?.color}
      />
    </div>
  );
}
