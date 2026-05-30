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

const navArrow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 36, height: 36, borderRadius: 8,
  border: '1px solid var(--admin-border)', background: 'none',
  color: 'var(--admin-text2)', fontSize: 18, lineHeight: 1,
  cursor: 'pointer', flexShrink: 0,
  WebkitTapHighlightColor: 'transparent',
};

export default function DayView({
  appointments,
  date,
  isToday,
  onPrev,
  onNext,
  onGoToday,
  isLoading,
}: {
  appointments: Appointment[];
  date: Date;
  isToday?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onGoToday?: () => void;
  isLoading?: boolean;
}) {
  const open = isOpen(date);

  // Revenue summary
  const active = appointments.filter((a) => a.status !== 'cancelled' && a.status !== 'blocked');
  const ericApts = active.filter((a) => a.staff === 'eric');
  const liviApts = active.filter((a) => a.staff === 'livi');
  const total = active.reduce((s, a) => s + a.price, 0);

  return (
    <div style={{ padding: '0 20px 40px' }}>
      {/* Date heading + nav */}
      <div style={{ paddingTop: 24, paddingBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 400,
              color: 'var(--admin-text)', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.2,
            }}>
              {fmtDate(date)}
            </h1>
            {isToday && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)', marginTop: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Today
              </div>
            )}
          </div>

          {(onPrev || onNext) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {!isToday && onGoToday && (
                <button
                  onClick={onGoToday}
                  style={{
                    fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500,
                    color: '#b5824a', background: 'none', cursor: 'pointer',
                    padding: '5px 10px', borderRadius: 6,
                    border: '1px solid var(--admin-border)',
                    WebkitTapHighlightColor: 'transparent',
                    marginRight: 2,
                  }}
                >
                  Today
                </button>
              )}
              <button onClick={onPrev} style={navArrow}>‹</button>
              <button onClick={onNext} style={navArrow}>›</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ opacity: isLoading ? 0.4 : 1, transition: 'opacity 0.15s ease' }}>
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
