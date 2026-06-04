'use client';
import type { Appointment } from '@/lib/admin-mock';
import { SERVICE_COLORS } from '@/lib/appointment-colors';
import StatsBox from './StatsBox';

const DAY_ABBR  = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

interface DayInfo {
  dateStr: string;
  day:     number;
  isToday: boolean;
  isPast:  boolean;
  isClosed: boolean;
  ericCount: number;
  liviCount: number;
  total: number;
}

export default function MonthView({
  appointments,
  monthStart,
  todayStr,
  openDays,
  onDayTap,
  onPrevMonth,
  onNextMonth,
  isLoading,
}: {
  appointments: Appointment[];
  monthStart:   Date;
  todayStr:     string;
  openDays?:    Record<number, boolean>;
  onDayTap:     (dateStr: string) => void;
  onPrevMonth:  () => void;
  onNextMonth:  () => void;
  isLoading?:   boolean;
}) {
  const year  = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow    = new Date(year, month, 1).getDay();

  // Build appointment map keyed by dateStr
  const aptMap = new Map<string, { eric: number; livi: number }>();
  for (const a of appointments) {
    if (a.status === 'cancelled') continue;
    if (!aptMap.has(a.date)) aptMap.set(a.date, { eric: 0, livi: 0 });
    const entry = aptMap.get(a.date)!;
    if (a.staff === 'eric') entry.eric++;
    else entry.livi++;
  }

  // Build grid cells (null = empty padding)
  const cells: (DayInfo | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow     = new Date(year, month, d).getDay();
    const counts  = aptMap.get(dateStr) ?? { eric: 0, livi: 0 };
    cells.push({
      dateStr,
      day:       d,
      isToday:   dateStr === todayStr,
      isPast:    dateStr < todayStr,
      isClosed:  openDays ? openDays[dow] === false : false,
      ericCount: counts.eric,
      liviCount: counts.livi,
      total:     counts.eric + counts.livi,
    });
  }
  // Pad to complete final row
  while (cells.length % 7 !== 0) cells.push(null);

  const canPrevMonth = !(year === new Date(todayStr).getFullYear() && month === new Date(todayStr).getMonth());

  // Busyness tint
  function cellTint(day: DayInfo): string {
    if (day.isPast || day.isClosed) return 'none';
    if (day.total === 0) return 'none';
    if (day.total <= 2) return `${SERVICE_COLORS.ericBarber}0d`;
    if (day.total <= 4) return `${SERVICE_COLORS.ericBarber}18`;
    return `${SERVICE_COLORS.ericBarber}28`;
  }

  const navArrow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36, borderRadius: 9,
    border: '1px solid var(--admin-border)',
    background: 'var(--admin-glass-bg)',
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    color: 'var(--admin-text2)', fontSize: 16,
    cursor: 'pointer', flexShrink: 0,
    WebkitTapHighlightColor: 'transparent',
  };

  return (
    <div style={{ padding: '0 0 40px' }}>

      {/* Month navigation */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px',
        position: 'sticky', top: 96, zIndex: 6,
        background: 'var(--admin-bg)',
        borderBottom: '1px solid var(--admin-border-sub)',
      }}>
        <button
          onClick={onPrevMonth}
          disabled={!canPrevMonth}
          style={{ ...navArrow, opacity: canPrevMonth ? 1 : 0.25, border: 'none', background: 'none' }}
        >‹</button>

        <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500, color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
          {MONTH_NAMES[month]} {year}
        </div>

        <button onClick={onNextMonth} style={{ ...navArrow, border: 'none', background: 'none' }}>›</button>
      </div>

      {/* Month stats */}
      {!isLoading && appointments.length > 0 && (
        <div style={{ padding: '12px 8px 0' }}>
          <StatsBox
            appointments={appointments}
            startDate={`${year}-${String(month + 1).padStart(2, '0')}-01`}
            endDate={`${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`}
          />
        </div>
      )}

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px 8px 4px', gap: 2 }}>
        {DAY_ABBR.map(d => (
          <div key={d} style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--admin-muted)', padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)' }}>
          Loading…
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 8px 8px', gap: 4 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;

            const tint = cellTint(day);
            const dimmed = day.isPast || day.isClosed;

            return (
              <button
                key={day.dateStr}
                onClick={() => onDayTap(day.dateStr)}
                style={{
                  position: 'relative',
                  minHeight: 72,
                  padding: '8px 6px 6px',
                  borderRadius: 10,
                  background: day.isToday
                    ? 'var(--admin-today-card)'
                    : tint !== 'none'
                      ? tint
                      : 'var(--admin-card)',
                  border: day.isToday
                    ? '1.5px solid var(--admin-today-card-border)'
                    : '1px solid var(--admin-border)',
                  cursor: 'pointer',
                  opacity: dimmed ? 0.4 : 1,
                  textAlign: 'left',
                  display: 'flex', flexDirection: 'column', gap: 4,
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'background 0.12s',
                }}
              >
                {/* Day number */}
                <div style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  fontWeight: day.isToday ? 600 : 400,
                  color: day.isToday ? '#4a9b6f' : 'var(--admin-text)',
                  lineHeight: 1,
                }}>
                  {day.day}
                </div>

                {/* Appointment indicators */}
                {day.total > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                    {day.ericCount > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: SERVICE_COLORS.ericBarber, flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-text2)', lineHeight: 1 }}>
                          {day.ericCount}
                        </span>
                      </div>
                    )}
                    {day.liviCount > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: SERVICE_COLORS.liviWax, flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-text2)', lineHeight: 1 }}>
                          {day.liviCount}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Closed label */}
                {day.isClosed && !day.isPast && (
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--admin-muted)', letterSpacing: '0.04em', marginTop: 2 }}>
                    Closed
                  </div>
                )}

                {/* Today dot */}
                {day.isToday && (
                  <span style={{ position: 'absolute', top: 6, right: 6, width: 5, height: 5, borderRadius: '50%', background: '#4a9b6f' }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 16px 0', justifyContent: 'flex-end' }}>
        {[
          { color: SERVICE_COLORS.ericBarber, label: 'Eric' },
          { color: SERVICE_COLORS.liviWax,    label: 'Livi' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
