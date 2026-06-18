'use client';
import { useState, useEffect } from 'react';
import type { Appointment } from '@/lib/admin-mock';
import { getAppointmentColor } from '@/lib/appointment-colors';
import { STAFF as ROSTER } from '@/lib/staff';
import { useRevenueAccess } from './RevenueAccess';
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
          {ROSTER.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 4, height: 14 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--admin-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{m.name[0]}</span>
            </div>
          ))}
        </div>

        {/* Timeline bars */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {ROSTER.map((m) => (
            <div key={m.id}>{renderRow(active.filter((a) => a.staff === m.id))}</div>
          ))}
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

function StaffStatus({ appointments, dayHours }: {
  appointments: Appointment[];
  dayHours: [number, number];
}) {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const active = appointments.filter(a => a.status !== 'cancelled' && a.status !== 'blocked');

  function staffInfo(staffId: string) {
    const apts = active.filter(a => a.staff === staffId);
    const current = apts.find(a => {
      const [sh, sm] = a.startTime.split(':').map(Number);
      const [eh, em] = a.endTime.split(':').map(Number);
      const s = sh*60+sm, e = eh*60+em;
      return nowMins >= s && nowMins < e;
    });
    const next = apts
      .filter(a => { const [h,m] = a.startTime.split(':').map(Number); return h*60+m > nowMins; })
      .sort((a,b) => a.startTime.localeCompare(b.startTime))[0];
    const totalMins = (dayHours[1] - dayHours[0]) * 60;
    const bookedMins = apts.reduce((s, a) => s + a.durationMinutes, 0);
    const util = totalMins > 0 ? Math.round(bookedMins / totalMins * 100) : 0;
    return { current, next, util };
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      {ROSTER.map((m) => {
        const id = m.id, label = m.name, color = m.color, info = staffInfo(m.id);
        function fmtTime(t: string) {
          const [h, m] = t.split(':').map(Number);
          const p = h >= 12 ? 'pm' : 'am';
          const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
          return `${hr}:${String(m).padStart(2,'0')}${p}`;
        }
        return (
          <div key={id} style={{
            flex: 1, padding: '10px 12px', borderRadius: 10,
            background: info.current ? `${color}18` : 'var(--admin-card)',
            border: `1px solid ${info.current ? `${color}40` : 'var(--admin-border)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500, color: 'var(--admin-text)' }}>{label}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: info.util >= 80 ? '#4a9b6f' : info.util >= 50 ? '#b5824a' : 'var(--admin-muted)', letterSpacing: '0.04em' }}>
                {info.util}%
              </span>
            </div>
            {info.current ? (
              <>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {info.current.clientName.split(' ')[0]}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', marginTop: 2 }}>
                  until {fmtTime(info.current.endTime)}
                </div>
              </>
            ) : info.next ? (
              <>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)' }}>Next</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-text)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {info.next.clientName.split(' ')[0]} · {fmtTime(info.next.startTime)}
                </div>
              </>
            ) : (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', fontStyle: 'italic' }}>Free</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });
}

const navArrow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 36, height: 36, borderRadius: 10,
  background: 'var(--admin-glass-bg)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid var(--admin-glass-border)',
  boxShadow: 'var(--admin-glass-shadow)',
  color: 'var(--admin-text2)', fontSize: 18, lineHeight: 1,
  cursor: 'pointer', flexShrink: 0,
  WebkitTapHighlightColor: 'transparent',
};

// ── Now / Up Next strip ───────────────────────────────────────────────────────

function pacificMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Vancouver', hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(new Date());
  const h = parseInt(parts.find(p => p.type === 'hour')!.value, 10) % 24;
  const m = parseInt(parts.find(p => p.type === 'minute')!.value, 10);
  return h * 60 + m;
}

function toMin(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

function fmtT(t: string) {
  const [h, m] = t.split(':').map(Number);
  const p = h >= 12 ? 'pm' : 'am';
  return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(m).padStart(2, '0')} ${p}`;
}

function NowStrip({ appointments }: { appointments: Appointment[] }) {
  const [nowMin, setNowMin] = useState(pacificMinutes);

  useEffect(() => {
    const id = setInterval(() => setNowMin(pacificMinutes()), 30_000);
    return () => clearInterval(id);
  }, []);

  const active = appointments.filter(a => a.status !== 'cancelled' && a.status !== 'blocked');

  const current = active.find(a => nowMin >= toMin(a.startTime) && nowMin < toMin(a.endTime));
  const next    = active
    .filter(a => toMin(a.startTime) > nowMin)
    .sort((a, b) => toMin(a.startTime) - toMin(b.startTime))[0];

  if (!current && !next) return null;

  function AptCell({ label, apt, accent }: { label: string; apt: Appointment | undefined; accent?: string }) {
    const color = apt ? getAppointmentColor(apt.staff, apt.service) : undefined;
    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: accent ?? 'var(--admin-muted)', marginBottom: 5,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {accent && <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent, display: 'inline-block' }} />}
          {label}
        </div>
        {apt ? (
          <>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--admin-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {apt.clientName}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-text3)', marginTop: 2 }}>
              {apt.service}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: color, marginTop: 3 }}>
              {fmtT(apt.startTime)} – {fmtT(apt.endTime)}
            </div>
          </>
        ) : (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)', fontStyle: 'italic' }}>
            —
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', gap: 0, marginBottom: 20,
      background: 'var(--admin-card)',
      border: '1px solid var(--admin-border)',
      borderLeft: `3px solid ${current ? '#4a9b6f' : 'var(--admin-border)'}`,
      borderRadius: 12, overflow: 'hidden',
      padding: '14px 16px',
    }}>
      <AptCell label="Now" apt={current} accent={current ? '#4a9b6f' : undefined} />
      {next && (
        <>
          <div style={{ width: 1, background: 'var(--admin-border)', margin: '0 16px' }} />
          <AptCell label="Up next" apt={next} />
        </>
      )}
    </div>
  );
}

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

  // Revenue summary — restricted viewers see only their own day total.
  const { canSeeAllRevenue, viewerStaff } = useRevenueAccess();
  const active = appointments.filter((a) => a.status !== 'cancelled' && a.status !== 'blocked');
  const total = (canSeeAllRevenue ? active : active.filter((a) => a.staff === viewerStaff))
    .reduce((s, a) => s + a.price, 0);

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
                    color: '#b5824a', cursor: 'pointer',
                    padding: '5px 10px', borderRadius: 9999,
                    background: 'var(--admin-glass-bg)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid var(--admin-glass-border)',
                    boxShadow: 'var(--admin-glass-shadow)',
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
        {/* Closed label — shown when studio is closed, but appointments still render below */}
        {!open && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Studio closed
            </div>
          </div>
        )}

        {/* Staff status bar — today only, when there are active appointments */}
        {isToday && active.length > 0 && <StaffStatus appointments={active} dayHours={dayHours} />}

        {/* Now / Up next — today only */}
        {isToday && <NowStrip appointments={active} />}

        {/* Summary row — always visible */}
        <div style={{
          display: 'flex', gap: 16, marginBottom: 20,
          padding: '12px 16px',
          background: 'var(--admin-card)',
          border: '1px solid var(--admin-border)',
          borderRadius: 12,
          boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
        }}>
          {(() => {
            const totalMins = (dayHours[1] - dayHours[0]) * 60;
            function util(apts: Appointment[]) {
              if (totalMins <= 0) return null;
              const booked = apts.reduce((s, a) => s + a.durationMinutes, 0);
              const pct = Math.round(booked / totalMins * 100);
              const color = pct >= 80 ? '#4a9b6f' : pct >= 50 ? '#b5824a' : 'var(--admin-muted)';
              return { pct, color };
            }
            return (
              <>
                <Stat label={canSeeAllRevenue ? 'Total' : 'Your total'} value={total > 0 ? `$${total}` : '—'} />
                {ROSTER.map((m) => {
                  const apts = active.filter((a) => a.staff === m.id);
                  const u = util(apts);
                  return (
                    <span key={m.id} style={{ display: 'contents' }}>
                      <div style={{ width: 1, background: 'var(--admin-border)' }} />
                      <Stat
                        label={m.name}
                        value={apts.length > 0 ? `${apts.length} apt${apts.length !== 1 ? 's' : ''}` : '—'}
                        color={apts.length > 0 ? m.color : undefined}
                        sub={u ? `${u.pct}% booked` : undefined}
                        subColor={u?.color}
                      />
                    </span>
                  );
                })}
              </>
            );
          })()}
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
      </div>
    </div>
  );
}

function Stat({ label, value, color, sub, subColor }: { label: string; value: string; color?: string; sub?: string; subColor?: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: color ?? 'var(--admin-text)' }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: subColor ?? 'var(--admin-muted)', marginTop: 3, letterSpacing: '0.02em' }}>
          {sub}
        </div>
      )}
    </div>
  );
}
