'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Appointment } from '@/lib/admin-mock';
import { getAppointmentColor, SERVICE_COLORS } from '@/lib/appointment-colors';

// ── constants ─────────────────────────────────────────────────────────────────
const H0 = 9, H1 = 19;
const PPM = 1.5;                              // px per minute (compact)
const TW = 28;                                // time-label column width
const TOTAL_PX = (H1 - H0) * 60 * PPM;       // 900 px
const HOURS = Array.from({ length: H1 - H0 + 1 }, (_, i) => H0 + i);
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const OPEN: Record<number, boolean> = { 0: true, 1: false, 2: false, 3: true, 4: true, 5: true, 6: true };

// ── helpers ───────────────────────────────────────────────────────────────────
function t2m(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h - H0) * 60 + m;
}
function localStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fmtHour(h: number): string {
  if (h === 12) return '12p';
  return h > 12 ? `${h - 12}p` : `${h}a`;
}

// ── overlap layout ────────────────────────────────────────────────────────────
// Returns { leftPct, widthPct } for each appointment.
// Eric always goes on the left, Livi on the right, only when they overlap.
function computePositions(apts: Appointment[]): Map<string, { leftPct: number; widthPct: number }> {
  const map = new Map<string, { leftPct: number; widthPct: number }>();
  for (const apt of apts) {
    const overlaps = apts.filter(
      (o) => o.id !== apt.id && o.startTime < apt.endTime && o.endTime > apt.startTime,
    );
    if (overlaps.length === 0) {
      map.set(apt.id, { leftPct: 0, widthPct: 100 });
    } else {
      // Stable lane order: eric=0, livi=1
      const laneOrder = ['eric', 'livi'];
      const lane = laneOrder.indexOf(apt.staff) === -1 ? 0 : laneOrder.indexOf(apt.staff);
      map.set(apt.id, { leftPct: lane * 50, widthPct: 50 });
    }
  }
  return map;
}

// ── component ─────────────────────────────────────────────────────────────────
export default function WeekGridView({
  appointments,
  weekStart,
}: {
  appointments: Appointment[];
  weekStart: Date;
}) {
  const router = useRouter();

  const today = new Date();
  const todayStr = localStr(today);

  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  const isThisWeek = localStr(weekStart) === localStr(thisWeekStart);

  const prevWeek = new Date(weekStart);
  prevWeek.setDate(weekStart.getDate() - 7);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(weekStart.getDate() + 7);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dateStr = localStr(d);
    const dayApts = appointments.filter(
      (a) => a.date === dateStr && a.status !== 'cancelled' && a.status !== 'blocked',
    );
    return {
      dateStr,
      dateObj: d,
      dow: d.getDay(),
      isToday: dateStr === todayStr,
      isOpen: OPEN[d.getDay()] ?? false,
      apts: dayApts,
      positions: computePositions(dayApts),
    };
  });

  // Current-time indicator
  const now = new Date();
  const nowMin = (now.getHours() - H0) * 60 + now.getMinutes();
  const showNow = nowMin >= 0 && nowMin <= (H1 - H0) * 60;

  const navArrow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, borderRadius: 7,
    border: '1px solid #252320', background: 'none',
    color: '#6b6760', fontSize: 16, lineHeight: 1,
    textDecoration: 'none', flexShrink: 0,
    WebkitTapHighlightColor: 'transparent',
  };

  return (
    <div>
      {/* Week nav */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px 10px 10px',
        borderBottom: '1px solid #1e1d1a',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!isThisWeek && (
            <Link
              href="/admin?tab=week&view=grid"
              style={{
                fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500,
                color: '#b5824a', textDecoration: 'none',
                padding: '4px 9px', borderRadius: 6,
                border: '1px solid #3a3530',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Today
            </Link>
          )}
          <Link href={`/admin?tab=week&week=${localStr(prevWeek)}&view=grid`} style={navArrow}>‹</Link>
          <Link href={`/admin?tab=week&week=${localStr(nextWeek)}&view=grid`} style={navArrow}>›</Link>
        </div>

        {/* Staff legend */}
        <div style={{ display: 'flex', gap: 10 }}>
          {(['eric', 'livi'] as const).map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: s === 'eric' ? SERVICE_COLORS.ericBarber : SERVICE_COLORS.liviWax,
              }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#6b6760' }}>
                {s === 'eric' ? 'Eric' : 'Livi'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Day headers — sticky */}
      <div style={{
        display: 'flex',
        paddingLeft: TW,
        position: 'sticky', top: 96, zIndex: 6,
        background: '#0d0c0a',
        borderBottom: '1px solid #1e1d1a',
      }}>
        {days.map((day) => (
          <div
            key={day.dateStr}
            style={{
              flex: 1, textAlign: 'center', padding: '6px 2px',
              opacity: day.isOpen ? 1 : 0.3,
            }}
          >
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 9,
              color: '#4a4844', letterSpacing: '0.06em',
              textTransform: 'uppercase', lineHeight: 1,
            }}>
              {DAY_ABBR[day.dow]}
            </div>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 400,
              color: day.isToday ? '#ece9e2' : '#7a7570',
              lineHeight: 1.2, marginTop: 2,
              ...(day.isToday ? {
                background: '#ece9e2', color: '#0d0c0a',
                borderRadius: '50%', width: 22, height: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '2px auto 0',
                fontSize: 13, fontWeight: 600,
              } : {}),
            }}>
              {day.dateObj.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div style={{ display: 'flex', position: 'relative', paddingBottom: 24 }}>

        {/* Hour labels */}
        <div style={{ width: TW, flexShrink: 0, position: 'relative', height: TOTAL_PX }}>
          {HOURS.map((h) => (
            <div key={h} style={{
              position: 'absolute',
              top: (h - H0) * 60 * PPM - 5,
              right: 4,
              fontFamily: 'var(--font-body)', fontSize: 9,
              color: '#3a3835', userSelect: 'none', lineHeight: 1,
            }}>
              {fmtHour(h)}
            </div>
          ))}
        </div>

        {/* Current-time bar */}
        {showNow && (
          <div style={{
            position: 'absolute',
            top: nowMin * PPM, left: TW, right: 0,
            height: 0, borderTop: '1px solid #b03030',
            zIndex: 4, pointerEvents: 'none',
          }}>
            <div style={{
              position: 'absolute', left: -3, top: -3,
              width: 6, height: 6, borderRadius: '50%', background: '#b03030',
            }} />
          </div>
        )}

        {/* Day columns */}
        {days.map((day) => (
          <div
            key={day.dateStr}
            style={{
              flex: 1, position: 'relative', height: TOTAL_PX,
              borderLeft: '1px solid #1e1d1a',
              opacity: day.isOpen ? 1 : 0.18,
              background: day.isToday ? '#141412' : 'transparent',
            }}
          >
            {/* Hour gridlines */}
            {HOURS.map((h) => (
              <div key={h} style={{
                position: 'absolute', top: (h - H0) * 60 * PPM,
                left: 0, right: 0,
                borderTop: h === H0 ? 'none' : '1px solid #1a1917',
                pointerEvents: 'none',
              }} />
            ))}

            {/* Half-hour gridlines */}
            {HOURS.slice(0, -1).map((h) => (
              <div key={`${h}h`} style={{
                position: 'absolute', top: (h - H0) * 60 * PPM + 30 * PPM,
                left: 0, right: 0, borderTop: '1px solid #161513',
                pointerEvents: 'none',
              }} />
            ))}

            {/* Appointment blocks */}
            {day.apts.map((apt) => {
              const topPx = t2m(apt.startTime) * PPM;
              const hPx = Math.max(apt.durationMinutes * PPM - 1, 14);
              const col = getAppointmentColor(apt.staff, apt.service);
              const pos = day.positions.get(apt.id) ?? { leftPct: 0, widthPct: 100 };

              return (
                <div
                  key={apt.id}
                  onClick={() => router.push(`/admin/appointments/${apt.id}`)}
                  style={{
                    position: 'absolute',
                    top: topPx,
                    left: `calc(${pos.leftPct}% + 1px)`,
                    width: `calc(${pos.widthPct}% - 2px)`,
                    height: hPx,
                    background: `${col}20`,
                    border: `1px solid ${col}50`,
                    borderLeft: `2px solid ${col}`,
                    borderRadius: 3,
                    padding: '2px 3px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    zIndex: 2,
                    boxSizing: 'border-box',
                  }}
                >
                  {hPx >= 14 && (
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: 9,
                      color: '#dedad4', lineHeight: 1.2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      paddingRight: apt.notes ? 8 : 0,
                    }}>
                      {apt.clientName.split(' ')[0]}
                    </div>
                  )}
                  {apt.notes && (
                    <div style={{
                      position: 'absolute', top: 2, right: 2,
                      fontSize: 8, color: '#b5824a', lineHeight: 1,
                    }}>
                      ≡
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
