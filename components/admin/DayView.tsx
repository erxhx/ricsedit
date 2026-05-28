import type { Appointment } from '@/lib/admin-mock';
import { SERVICE_COLORS } from '@/lib/appointment-colors';
import AppointmentCard from './AppointmentCard';

const STUDIO_HOURS: Record<number, boolean> = { 0: true, 1: false, 2: false, 3: true, 4: true, 5: true, 6: true };

function isOpen(date: Date): boolean {
  return STUDIO_HOURS[date.getDay()] ?? false;
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function DayView({ appointments, date }: { appointments: Appointment[]; date: Date }) {
  const open = isOpen(date);

  // Revenue summary
  const active = appointments.filter((a) => a.status !== 'cancelled' && a.status !== 'blocked');
  const ericApts = active.filter((a) => a.staff === 'eric');
  const liviApts = active.filter((a) => a.staff === 'livi');
  const total = active.reduce((s, a) => s + a.price, 0);

  return (
    <div style={{ padding: '0 20px 40px' }}>
      {/* Date heading */}
      <div style={{ paddingTop: 24, paddingBottom: 20 }}>
        <h1 style={{
          fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 400,
          color: 'var(--admin-text)', margin: 0, letterSpacing: '-0.01em',
        }}>
          {fmtDate(date)}
        </h1>
      </div>

      {!open ? (
        <div style={{ paddingTop: 32, textAlign: 'center', color: 'var(--admin-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>—</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text3)' }}>Studio closed</div>
        </div>
      ) : appointments.length === 0 ? (
        <div style={{ paddingTop: 32, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text3)' }}>No bookings today</div>
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div style={{
            display: 'flex', gap: 16, marginBottom: 24,
            padding: '12px 16px',
            background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: 10,
          }}>
            <Stat label="Total" value={`$${total}`} />
            <div style={{ width: 1, background: 'var(--admin-border)' }} />
            <Stat label="Eric" value={`${ericApts.length} apt${ericApts.length !== 1 ? 's' : ''}`} color={SERVICE_COLORS.ericBarber} />
            <div style={{ width: 1, background: 'var(--admin-border)' }} />
            <Stat label="Livi" value={`${liviApts.length} apt${liviApts.length !== 1 ? 's' : ''}`} color={SERVICE_COLORS.liviWax} />
          </div>

          {/* Appointment list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {appointments.map((a) => (
              <AppointmentCard key={a.id} apt={a} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: color ?? 'var(--admin-text)' }}>
        {value}
      </div>
    </div>
  );
}
