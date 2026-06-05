'use client';
import { useState } from 'react';
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

const QUICK_LABELS_MV = ['Lunch', 'Break', 'Personal', 'Studio closed'] as const;

export default function MonthView({
  appointments,
  monthStart,
  todayStr,
  openDays,
  onDayTap,
  onPrevMonth,
  onNextMonth,
  onRefresh,
  isLoading,
  modeToggle,
}: {
  appointments: Appointment[];
  monthStart:   Date;
  todayStr:     string;
  openDays?:    Record<number, boolean>;
  onDayTap:     (dateStr: string) => void;
  onPrevMonth:  () => void;
  onNextMonth:  () => void;
  onRefresh?:   () => void;
  isLoading?:   boolean;
  modeToggle?:  React.ReactNode;
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

  const canPrevMonth = true;

  // Block range state
  const [showBlockRange, setShowBlockRange] = useState(false);
  const [brStart,   setBrStart]   = useState('');
  const [brEnd,     setBrEnd]     = useState('');
  const [brLabel,   setBrLabel]   = useState('');
  const [brStaff,   setBrStaff]   = useState<'eric' | 'livi' | 'both'>('both');
  const [brLoading, setBrLoading] = useState(false);

  function openBlockRange() {
    const y = monthStart.getFullYear();
    const m = String(monthStart.getMonth() + 1).padStart(2, '0');
    setBrStart(`${y}-${m}-01`);
    setBrEnd(`${y}-${m}-${String(daysInMonth).padStart(2, '0')}`);
    setBrLabel('');
    setBrStaff('both');
    setShowBlockRange(true);
  }

  async function confirmBlockRange() {
    if (!brStart || !brEnd || brStart > brEnd) return;
    setBrLoading(true);
    try {
      const label   = brLabel.trim() || 'Blocked';
      const staffList = brStaff === 'both' ? ['eric', 'livi'] as const : [brStaff];
      const start = new Date(brStart + 'T12:00:00');
      const end   = new Date(brEnd   + 'T12:00:00');
      const requests: Promise<unknown>[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        for (const staff of staffList) {
          requests.push(
            fetch('/api/admin/appointments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                date: dateStr, startTime: '08:00', endTime: '22:00',
                staff, clientName: '', clientEmail: '', clientPhone: '',
                service: label, durationMinutes: 840, price: 0, status: 'blocked',
              }),
            })
          );
        }
      }
      await Promise.all(requests);
      setShowBlockRange(false);
      onRefresh?.();
    } finally {
      setBrLoading(false);
    }
  }

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

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {modeToggle}
          <button
            onClick={openBlockRange}
            style={{ ...navArrow, fontSize: 11, fontFamily: 'var(--font-body)', width: 'auto', padding: '0 10px', color: 'var(--admin-muted)', letterSpacing: '0.04em' }}
          >
            Block range
          </button>
          <button onClick={onNextMonth} style={{ ...navArrow, border: 'none', background: 'none' }}>›</button>
        </div>
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

      {/* Block range sheet */}
      {showBlockRange && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }} onClick={() => setShowBlockRange(false)}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--admin-sheet)', borderRadius: '16px 16px 0 0', padding: '24px 20px 44px', overflowY: 'auto', maxHeight: '90vh' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500, color: 'var(--admin-text)', marginBottom: 20 }}>Block date range</div>

            {/* Date range */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              {[['From', brStart, setBrStart], ['To', brEnd, setBrEnd]].map(([label, val, setter]) => (
                <div key={label as string} style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 6 }}>{label as string}</div>
                  <input
                    type="date"
                    value={val as string}
                    onChange={e => (setter as (v: string) => void)(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-btn)', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)', outline: 'none' }}
                  />
                </div>
              ))}
            </div>

            {/* Label */}
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 8 }}>Label</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {QUICK_LABELS_MV.map(lbl => {
                const active = brLabel === lbl;
                return (
                  <button key={lbl} onClick={() => setBrLabel(active ? '' : lbl)} style={{ padding: '7px 12px', borderRadius: 20, border: active ? '1.5px solid var(--admin-text)' : '1px solid var(--admin-border)', background: active ? 'var(--admin-text-tint)' : 'none', fontFamily: 'var(--font-body)', fontSize: 13, color: active ? 'var(--admin-text)' : 'var(--admin-text2)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                    {lbl}
                  </button>
                );
              })}
            </div>
            <input type="text" value={brLabel} onChange={e => setBrLabel(e.target.value)} placeholder="Custom label…" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-btn)', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)', outline: 'none', marginBottom: 20 }} />

            {/* Staff */}
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 8 }}>Staff</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
              {(['eric', 'livi', 'both'] as const).map(s => (
                <button key={s} onClick={() => setBrStaff(s)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: brStaff === s ? '1.5px solid var(--admin-text)' : '1px solid var(--admin-border)', background: brStaff === s ? 'var(--admin-text-tint)' : 'none', fontFamily: 'var(--font-body)', fontSize: 13, color: brStaff === s ? 'var(--admin-text)' : 'var(--admin-text2)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', textTransform: 'capitalize' }}>
                  {s === 'both' ? 'Both' : s === 'eric' ? 'Eric' : 'Livi'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={confirmBlockRange} disabled={brLoading || !brStart || !brEnd || brStart > brEnd} style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: 'var(--admin-btn-primary-bg)', color: 'var(--admin-btn-primary-fg)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: brLoading ? 0.6 : 1 }}>
                {brLoading ? 'Blocking…' : 'Block range'}
              </button>
              <button onClick={() => setShowBlockRange(false)} style={{ width: '100%', padding: '14px', borderRadius: 10, border: '1px solid var(--admin-border)', background: 'none', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text2)', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
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
