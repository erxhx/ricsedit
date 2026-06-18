import Link from 'next/link';
import type { Appointment } from '@/lib/admin-mock';
import { getAppointmentColor } from '@/lib/appointment-colors';
import { STAFF_IDS } from '@/lib/staff';
import StatsBox from './StatsBox';

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DaySummary {
  date: string;
  dateObj: Date;
  isOpen: boolean;
  isToday: boolean;
  total: number;
  dotColors: string[]; // one accent colour per appointment, grouped by staff
  revenue: number;
  hasNotes: boolean;
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtWeekRange(start: Date): string {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const sm = start.toLocaleDateString('en-US', { month: 'short' });
  const em = end.toLocaleDateString('en-US', { month: 'short' });
  if (sm === em) return `${sm} ${start.getDate()} – ${end.getDate()}`;
  return `${sm} ${start.getDate()} – ${em} ${end.getDate()}`;
}

export default function WeekView({ appointments, weekStart, isLoading, onPrevWeek, onNextWeek, onGoCurrentWeek, openDays }: {
  appointments: Appointment[];
  weekStart: Date;
  isLoading?: boolean;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onGoCurrentWeek?: () => void;
  openDays?: Record<number, boolean>;
}) {
  const today = new Date();
  const todayStr = localDateStr(today);

  // Is this the current week?
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  const isThisWeek = localDateStr(weekStart) === localDateStr(thisWeekStart);


  const days: DaySummary[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dateStr = localDateStr(d);
    const dayApts = appointments.filter((a) => a.date === dateStr && a.status !== 'cancelled' && a.status !== 'blocked');
    const sorted = [...dayApts].sort((a, b) => STAFF_IDS.indexOf(a.staff) - STAFF_IDS.indexOf(b.staff));
    return {
      date: dateStr,
      dateObj: d,
      isOpen: openDays ? (openDays[d.getDay()] ?? true) : true,
      isToday: dateStr === todayStr,
      total: dayApts.length,
      dotColors: sorted.map((a) => getAppointmentColor(a.staff, a.service)),
      revenue:  dayApts.reduce((s, a) => s + a.price, 0),
      hasNotes: dayApts.some((a) => !!a.notes),
    };
  });

  const weekRevenue = days.reduce((s, d) => s + d.revenue, 0);
  const weekApts = days.reduce((s, d) => s + d.total, 0);

  const navArrow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36, borderRadius: 10,
    background: 'var(--admin-glass-bg)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--admin-glass-border)',
    boxShadow: 'var(--admin-glass-shadow)',
    color: 'var(--admin-text2)', fontSize: 18, lineHeight: 1,
    flexShrink: 0, cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  };

  return (
    <div style={{ padding: '0 20px 40px' }}>
      {/* Heading + week navigation */}
      <div style={{ paddingTop: 24, paddingBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 400, color: 'var(--admin-text)', margin: 0, lineHeight: 1.2 }}>
              {fmtWeekRange(weekStart)}
            </h1>
            {isThisWeek && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)', marginTop: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                This week
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {!isThisWeek && onGoCurrentWeek && (
              <button
                onClick={onGoCurrentWeek}
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
            <button onClick={onPrevWeek} style={navArrow}>‹</button>
            <button onClick={onNextWeek} style={navArrow}>›</button>
          </div>
        </div>
      </div>

      <div style={{ opacity: isLoading ? 0.4 : 1, transition: 'opacity 0.15s ease' }}>
        {/* Week totals */}
        <div style={{ marginBottom: 20 }}>
          <StatsBox
            appointments={appointments}
            startDate={localDateStr(weekStart)}
            endDate={localDateStr(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6))}
          />
        </div>

        {/* Day cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {days.map((day) => (
            <DayCard key={day.date} day={day} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayCard({ day }: { day: DaySummary }) {
  const dow = day.dateObj.getDay();
  return (
    <Link href={`/admin/day/${day.date}`} style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      background: day.isToday ? 'var(--admin-today-card)' : 'var(--admin-card)',
      border: `1px solid ${day.isToday ? 'var(--admin-today-card-border)' : 'var(--admin-border)'}`,
      borderRadius: 10,
      padding: '12px 16px',
      opacity: day.isOpen ? 1 : 0.6,
      textDecoration: 'none',
      WebkitTapHighlightColor: 'transparent',
    }}>
      {/* Day label */}
      <div style={{ width: 36 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {DAY_ABBR[dow]}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 400, color: day.isToday ? 'var(--admin-text)' : 'var(--admin-text3)', lineHeight: 1.1 }}>
          {day.dateObj.getDate()}
        </div>
      </div>

      <>
        {/* Booking dots */}
        <div style={{ flex: 1 }}>
          {day.total === 0 ? (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)' }}>
              {day.isOpen ? 'No bookings' : 'Closed'}
            </span>
          ) : (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
              {day.dotColors.map((c, i) => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
              ))}
              {!day.isOpen && (
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', letterSpacing: '0.06em', marginLeft: 2 }}>closed</span>
              )}
            </div>
          )}
        </div>

        {/* Revenue + note indicator + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {day.total > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--admin-text)' }}>
                ${day.revenue}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 2 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)' }}>
                  {day.total} apt{day.total !== 1 ? 's' : ''}
                </span>
                {day.hasNotes && (
                  <span style={{
                    fontSize: 10, color: '#b5824a',
                    background: 'var(--admin-note)', border: '1px solid var(--admin-note-border)',
                    borderRadius: 3, padding: '0px 4px', lineHeight: '16px',
                  }}>≡</span>
                )}
              </div>
            </div>
          )}
          <span style={{ fontSize: 16, color: 'var(--admin-muted)' }}>›</span>
        </div>
      </>
    </Link>
  );
}

function WeekStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: 'var(--admin-text)' }}>
        {value}
      </div>
    </div>
  );
}
