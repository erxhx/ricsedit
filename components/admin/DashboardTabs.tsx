'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Appointment } from '@/lib/admin-mock';
import DayView from './DayView';
import WeekView from './WeekView';
import DaySchedule from './DaySchedule';
import WeekGridView from './WeekGridView';

// Heights: AdminHeader=52, tab bar=44, sub-toggle=36 → column headers sticky at 132
const SUB_STICKY = 132;

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DashboardTabs({
  todayApts,
  weekApts,
  today,
  weekStart,
}: {
  todayApts: Appointment[];
  weekApts: Appointment[];
  today: Date;
  weekStart: Date;
}) {
  const searchParams = useSearchParams();

  // Derive initial state from URL params (supports old ?tab=week URLs too)
  function initTab(): 'overview' | 'calendar' {
    const t = searchParams.get('tab');
    if (t === 'calendar') return 'calendar';
    if (t === 'overview') return 'overview';
    // legacy: old ?view=grid or ?tab=week → calendar
    if (searchParams.get('view') === 'grid') return 'calendar';
    return 'overview';
  }
  function initOverviewMode(): 'day' | 'week' {
    if (searchParams.get('tab') === 'overview' && searchParams.get('mode') === 'week') return 'week';
    if (searchParams.get('tab') === 'week') return 'week'; // legacy
    return 'day';
  }
  function initCalendarMode(): 'day' | 'week' {
    if (searchParams.get('tab') === 'calendar' && searchParams.get('mode') === 'day') return 'day';
    return 'week'; // default Calendar to week grid
  }

  const [activeTab,    setActiveTab]    = useState<'overview' | 'calendar'>(initTab);
  const [overviewMode, setOverviewMode] = useState<'day' | 'week'>(initOverviewMode);
  const [calendarMode, setCalendarMode] = useState<'day' | 'week'>(initCalendarMode);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'calendar') { setActiveTab('calendar'); }
    else if (t === 'overview') { setActiveTab('overview'); }
    const mode = searchParams.get('mode');
    if (t === 'overview') setOverviewMode(mode === 'week' ? 'week' : 'day');
    if (t === 'calendar') setCalendarMode(mode === 'day' ? 'day' : 'week');
  }, [searchParams]);

  const dayMode   = activeTab === 'overview' ? overviewMode   : calendarMode;
  const setDayMode = activeTab === 'overview' ? setOverviewMode : setCalendarMode;

  return (
    <div>
      {/* ── main tab bar ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        borderBottom: '1px solid var(--admin-border)',
        padding: '0 16px',
        background: 'var(--admin-bg)',
        position: 'sticky', top: 52, zIndex: 9,
        height: 44,
      }}>
        {(['overview', 'calendar'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              fontFamily: 'var(--font-body)', fontSize: 13,
              fontWeight: activeTab === t ? 500 : 400,
              color: activeTab === t ? 'var(--admin-text)' : 'var(--admin-muted)',
              background: 'none', border: 'none',
              borderBottom: activeTab === t ? '2px solid var(--admin-text)' : '2px solid transparent',
              padding: '0 14px',
              height: '100%',
              cursor: 'pointer',
              marginBottom: -1,
              textTransform: 'capitalize',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {t}
          </button>
        ))}

        {/* New booking button */}
        <a
          href="/admin/new-booking"
          style={{
            marginLeft: 'auto',
            display: 'flex', alignItems: 'center',
            fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500,
            color: 'var(--admin-text)',
            background: 'var(--admin-btn)',
            border: 'none', borderRadius: 6,
            padding: '5px 12px',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          + New
        </a>
      </div>

      {/* ── day / week sub-toggle ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '0 16px',
        background: 'var(--admin-bg)',
        borderBottom: '1px solid var(--admin-border-sub)',
        position: 'sticky', top: 96, zIndex: 8,
        height: 36,
        gap: 4,
      }}>
        {(['day', 'week'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setDayMode(m)}
            style={{
              fontFamily: 'var(--font-body)', fontSize: 12,
              fontWeight: dayMode === m ? 500 : 400,
              color: dayMode === m ? 'var(--admin-text)' : 'var(--admin-muted)',
              background: dayMode === m ? 'var(--admin-btn)' : 'none',
              border: dayMode === m ? '1px solid var(--admin-btn-border)' : '1px solid transparent',
              borderRadius: 6,
              padding: '3px 12px',
              cursor: 'pointer',
              textTransform: 'capitalize',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {m}
          </button>
        ))}

        {/* Date context label */}
        <span style={{
          marginLeft: 'auto',
          fontFamily: 'var(--font-body)', fontSize: 11,
          color: 'var(--admin-muted)', letterSpacing: '0.03em',
        }}>
          {dayMode === 'day'
            ? today.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
            : null
          }
        </span>
      </div>

      {/* ── content ───────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && overviewMode === 'day'  && <DayView appointments={todayApts} date={today} />}
      {activeTab === 'overview' && overviewMode === 'week' && <WeekView appointments={weekApts} weekStart={weekStart} />}
      {activeTab === 'calendar' && calendarMode === 'day'  && <DaySchedule appointments={todayApts} date={localDateStr(today)} stickyTop={SUB_STICKY} />}
      {activeTab === 'calendar' && calendarMode === 'week' && <WeekGridView appointments={weekApts} weekStart={weekStart} stickyTop={SUB_STICKY} />}
    </div>
  );
}
