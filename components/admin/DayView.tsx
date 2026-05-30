import type { Appointment } from '@/lib/admin-mock';
import { SERVICE_COLORS, getAppointmentColor } from '@/lib/appointment-colors';
import AppointmentCard from './AppointmentCard';

// ── Day timeline ──────────────────────────────────────────────────────────────

function tlMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function tlHourLabel(h: number): string {
  return h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`;
}

function DayTimeline({
  appointments,
  isToday,
  hours,
}: {
  appointments: Appointment[];
  isToday?: boolean;
  hours: [number, number];
}) {
  const TL_START = hours[0] * 60;
  const TL_END   = hours[1] * 60;
  const TL_RANGE = TL_END - TL_START;

  function tlPct(mins: number): number {
    return Math.max(0, Math.min(100, (mins - TL_START) / TL_RANGE * 100));
  }

  const active = appointments.filter((a) => a.status !== 'cancelled' && a.status !== 'blocked');
  const ericApts = active.filter((a) => a.staff === 'eric');
  const liviApts = active.filter((a) => a.staff === 'livi');

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const nowPct = tlPct(nowMins);
  const showNow = isToday && nowMins >= TL_START && nowMins <= TL_END;

  // Hour labels: only whole hours within the open range
  const hourLabels: number[] = [];
  for (let h = hours[0]; h <= hours[1]; h++) {
    if (h === hours[0] || h === hours[1] || (h % 3 === 0)) hourLabels.push(h);
  }

  function renderRow(apts: Appointment[]) {
    return (
      <div style={{ position: 'relative', height: 14, borderRadius: 3, overflow: 'hidden', background: 'var(--admin-border)' }}>
        {apts.map((apt) => {
          const left  = tlPct(tlMins(apt.startTime));
          const right = tlPct(tlMins(apt.endTime));
          const color = getAppointmentColor(apt.staff, apt.service);
          return (
            <div key={apt.id} style={{
              position: 'absolute', top: 0, bottom: 0,
              left: `${left}%`, width: `${right - left}%`,
              background: color,
              opacity: 0.85,
            }} />
          );
        })}
        {showNow && (
          <div style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${nowPct}%`, width: 1.5,
            background: '#b03030', zIndex: 2,
          }} />
        )}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {/* Staff labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 14 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: SERVICE_COLORS.ericBarber, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--admin-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>E</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 14 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: SERVICE_COLORS.liviWax, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--admin-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>L</span>
          </div>
        </div>

        {/* Timeline bars */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {renderRow(ericApts)}
          {renderRow(liviApts)}
        </div>
      </div>

      {/* Hour labels */}
      <div style={{ position: 'relative', height: 14, marginLeft: 22, marginTop: 3 }}>
        {hourLabels.map((h) => (
          <span key={h} style={{
            position: 'absolute',
            left: `${tlPct(h * 60)}%`,
            transform: 'translateX(-50%)',
            fontFamily: 'var(--font-body)', fontSize: 9,
            color: 'var(--admin-muted)', letterSpacing: '0.04em',
          }}>
            {tlHourLabel(h)}
          </span>
        ))}
      </div>
    </div>
  );
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
  openDays,
  hoursByDay,
}: {
  appointments: Appointment[];
  date: Date;
  isToday?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onGoToday?: () => void;
  isLoading?: boolean;
  openDays?: Record<number, boolean>;
  hoursByDay?: Record<number, [number, number] | null>;
}) {
  const open = openDays ? (openDays[date.getDay()] ?? true) : true;
  const dayHours: [number, number] = hoursByDay?.[date.getDay()] ?? [10, 18];

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
        ) : (
          <>
            {/* Summary row — always visible when open, even with zero bookings */}
            <div style={{
              display: 'flex', gap: 16, marginBottom: 24,
              padding: '12px 16px',
              background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: 8,
            }}>
              <Stat label="Total" value={total > 0 ? `$${total}` : '—'} />
              <div style={{ width: 1, background: 'var(--admin-border)' }} />
              <Stat
                label="Eric"
                value={ericApts.length > 0 ? `${ericApts.length} apt${ericApts.length !== 1 ? 's' : ''}` : '—'}
                color={ericApts.length > 0 ? SERVICE_COLORS.ericBarber : undefined}
              />
              <div style={{ width: 1, background: 'var(--admin-border)' }} />
              <Stat
                label="Livi"
                value={liviApts.length > 0 ? `${liviApts.length} apt${liviApts.length !== 1 ? 's' : ''}` : '—'}
                color={liviApts.length > 0 ? SERVICE_COLORS.liviWax : undefined}
              />
            </div>

            {active.length > 0 ? (
              <>
                {/* Timeline strip */}
                <DayTimeline appointments={active} isToday={isToday} hours={dayHours} />

                {/* Appointment list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {appointments.map((a) => (
                    <AppointmentCard key={a.id} apt={a} />
                  ))}
                </div>
              </>
            ) : (
              <div style={{ paddingTop: 16, textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text3)' }}>No bookings</div>
              </div>
            )}
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
