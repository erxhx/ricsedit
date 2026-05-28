import Link from 'next/link';
import type { Appointment } from '@/lib/admin-mock';
import { SERVICE_COLORS, liviCategory } from '@/lib/appointment-colors';

const STUDIO_HOURS: Record<number, boolean> = { 0: true, 1: false, 2: false, 3: true, 4: true, 5: true, 6: true };
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DaySummary {
  date: string;
  dateObj: Date;
  isOpen: boolean;
  isToday: boolean;
  total: number;
  ericCount: number;
  liviWaxCount: number;
  liviTanCount: number;
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

export default function WeekView({ appointments, weekStart }: { appointments: Appointment[]; weekStart: Date }) {
  const today = new Date();
  const todayStr = localDateStr(today);

  // Is this the current week?
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  const isThisWeek = localDateStr(weekStart) === localDateStr(thisWeekStart);

  // Prev / next week Sunday dates
  const prevWeek = new Date(weekStart);
  prevWeek.setDate(weekStart.getDate() - 7);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(weekStart.getDate() + 7);

  const days: DaySummary[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dateStr = localDateStr(d);
    const dayApts = appointments.filter((a) => a.date === dateStr && a.status !== 'cancelled' && a.status !== 'blocked');
    const liviApts = dayApts.filter((a) => a.staff === 'livi');
    return {
      date: dateStr,
      dateObj: d,
      isOpen: STUDIO_HOURS[d.getDay()] ?? false,
      isToday: dateStr === todayStr,
      total: dayApts.length,
      ericCount: dayApts.filter((a) => a.staff === 'eric').length,
      liviWaxCount: liviApts.filter((a) => liviCategory(a.service) === 'wax').length,
      liviTanCount: liviApts.filter((a) => liviCategory(a.service) === 'tan').length,
      revenue:  dayApts.reduce((s, a) => s + a.price, 0),
      hasNotes: dayApts.some((a) => !!a.notes),
    };
  });

  const weekRevenue = days.reduce((s, d) => s + d.revenue, 0);
  const weekApts = days.reduce((s, d) => s + d.total, 0);

  const navArrow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36, borderRadius: 8,
    border: '1px solid #d4cfc6', background: 'none',
    color: '#4a4540', fontSize: 18, lineHeight: 1,
    textDecoration: 'none', flexShrink: 0,
    WebkitTapHighlightColor: 'transparent',
  };

  return (
    <div style={{ padding: '0 20px 40px' }}>
      {/* Heading + week navigation */}
      <div style={{ paddingTop: 24, paddingBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 400, color: '#141210', margin: 0, lineHeight: 1.2 }}>
              {fmtWeekRange(weekStart)}
            </h1>
            {isThisWeek && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#9a9590', marginTop: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                This week
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {/* Jump to today — only shown when browsing a different week */}
            {!isThisWeek && (
              <Link
                href="/admin?tab=overview&mode=week"
                style={{
                  fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500,
                  color: '#b5824a', textDecoration: 'none',
                  padding: '5px 10px', borderRadius: 6,
                  border: '1px solid #d4cfc6',
                  WebkitTapHighlightColor: 'transparent',
                  marginRight: 2,
                }}
              >
                Today
              </Link>
            )}
            <Link href={`/admin?tab=overview&mode=week&week=${localDateStr(prevWeek)}`} style={navArrow}>‹</Link>
            <Link href={`/admin?tab=overview&mode=week&week=${localDateStr(nextWeek)}`} style={navArrow}>›</Link>
          </div>
        </div>
      </div>

      {/* Week totals */}
      <div style={{
        display: 'flex', gap: 16, marginBottom: 24,
        padding: '12px 16px',
        background: '#f7f3eb', border: '1px solid #d4cfc6', borderRadius: 10,
      }}>
        <WeekStat label="Revenue" value={`$${weekRevenue}`} />
        <div style={{ width: 1, background: '#d4cfc6' }} />
        <WeekStat label="Bookings" value={String(weekApts)} />
      </div>

      {/* Day cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {days.map((day) => (
          <DayCard key={day.date} day={day} />
        ))}
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
      background: day.isToday ? '#eef7e8' : '#f7f3eb',
      border: `1px solid ${day.isToday ? '#b5d4b0' : '#d4cfc6'}`,
      borderRadius: 10,
      padding: '12px 16px',
      opacity: day.isOpen ? 1 : 0.6,
      textDecoration: 'none',
      WebkitTapHighlightColor: 'transparent',
    }}>
      {/* Day label */}
      <div style={{ width: 36 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#9a9590', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {DAY_ABBR[dow]}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 400, color: day.isToday ? '#141210' : '#6a6560', lineHeight: 1.1 }}>
          {day.dateObj.getDate()}
        </div>
      </div>

      <>
        {/* Booking dots */}
        <div style={{ flex: 1 }}>
          {day.total === 0 ? (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#9a9590' }}>
              {day.isOpen ? 'No bookings' : 'Closed'}
            </span>
          ) : (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
              {Array.from({ length: day.ericCount }, (_, i) => (
                <div key={`e${i}`} style={{ width: 7, height: 7, borderRadius: '50%', background: SERVICE_COLORS.ericBarber }} />
              ))}
              {Array.from({ length: day.liviWaxCount }, (_, i) => (
                <div key={`lw${i}`} style={{ width: 7, height: 7, borderRadius: '50%', background: SERVICE_COLORS.liviWax }} />
              ))}
              {Array.from({ length: day.liviTanCount }, (_, i) => (
                <div key={`lt${i}`} style={{ width: 7, height: 7, borderRadius: '50%', background: SERVICE_COLORS.liviTan }} />
              ))}
              {!day.isOpen && (
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: '#9a9590', letterSpacing: '0.06em', marginLeft: 2 }}>closed</span>
              )}
            </div>
          )}
        </div>

        {/* Revenue + note indicator + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {day.total > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: '#141210' }}>
                ${day.revenue}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 2 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#9a9590' }}>
                  {day.total} apt{day.total !== 1 ? 's' : ''}
                </span>
                {day.hasNotes && (
                  <span style={{
                    fontSize: 10, color: '#b5824a',
                    background: '#fdf3e8', border: '1px solid #e8d4b0',
                    borderRadius: 3, padding: '0px 4px', lineHeight: '16px',
                  }}>≡</span>
                )}
              </div>
            </div>
          )}
          <span style={{ fontSize: 16, color: '#9a9590' }}>›</span>
        </div>
      </>
    </Link>
  );
}

function WeekStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: '#9a9590', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: '#141210' }}>
        {value}
      </div>
    </div>
  );
}
