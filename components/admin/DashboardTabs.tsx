'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Appointment } from '@/lib/admin-mock';
import DayView from './DayView';
import WeekView from './WeekView';
import DaySchedule from './DaySchedule';
import WeekGridView from './WeekGridView';

// Heights: AdminHeader=52, tab bar=44 (sub-toggle merged in) → column headers sticky at 96
const SUB_STICKY = 96;

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function strToLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d); // local midnight — no UTC offset skew
}

export default function DashboardTabs({
  todayApts,
  weekApts,
  todayStr,
  weekStartStr,
  openDays,
}: {
  todayApts: Appointment[];
  weekApts: Appointment[];
  todayStr: string;
  weekStartStr: string;
  openDays: Record<number, boolean>;
}) {
  // Reconstruct dates locally so timezone serialization from the server can't shift the day
  const today     = strToLocalDate(todayStr);
  const weekStart = strToLocalDate(weekStartStr);

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
    return 'day';
  }
  function initCalendarMode(): 'day' | 'week' {
    if (searchParams.get('tab') === 'calendar' && searchParams.get('mode') === 'day') return 'day';
    return 'week'; // default Calendar to week grid
  }

  const [activeTab,    setActiveTab]    = useState<'overview' | 'calendar'>(initTab);
  const [overviewMode, setOverviewMode] = useState<'day' | 'week'>(initOverviewMode);
  const [calendarMode, setCalendarMode] = useState<'day' | 'week'>(initCalendarMode);

  // Day navigation state
  const [viewDate, setViewDate] = useState<Date>(today);
  const [viewApts, setViewApts] = useState<Appointment[]>(todayApts);
  const [loadingApts, setLoadingApts] = useState(false);

  // Week navigation state
  const [viewWeekStart, setViewWeekStart] = useState<Date>(weekStart);
  const [viewWeekApts,  setViewWeekApts]  = useState<Appointment[]>(weekApts);
  const [loadingWeek,   setLoadingWeek]   = useState(false);

  // Fetch day appointments whenever viewDate changes
  useEffect(() => {
    if (localDateStr(viewDate) === localDateStr(today)) {
      setViewApts(todayApts);
      return;
    }
    setLoadingApts(true);
    fetch(`/api/admin/appointments?date=${localDateStr(viewDate)}`)
      .then((r) => r.json())
      .then((data) => { setViewApts(Array.isArray(data) ? data : []); })
      .catch(() => setViewApts([]))
      .finally(() => setLoadingApts(false));
  }, [localDateStr(viewDate)]);

  // Fetch week appointments whenever viewWeekStart changes
  useEffect(() => {
    if (localDateStr(viewWeekStart) === weekStartStr) {
      setViewWeekApts(weekApts);
      return;
    }
    const weekEnd = addDays(viewWeekStart, 6);
    setLoadingWeek(true);
    fetch(`/api/admin/appointments?start=${localDateStr(viewWeekStart)}&end=${localDateStr(weekEnd)}`)
      .then((r) => r.json())
      .then((data) => { setViewWeekApts(Array.isArray(data) ? data : []); })
      .catch(() => setViewWeekApts([]))
      .finally(() => setLoadingWeek(false));
  }, [localDateStr(viewWeekStart)]);

  function prevDay()  { setViewDate((d) => addDays(d, -1)); }
  function nextDay()  { setViewDate((d) => addDays(d,  1)); }
  function goToToday() { setViewDate(today); }

  function prevWeek()        { setViewWeekStart((d) => addDays(d, -7)); }
  function nextWeek()        { setViewWeekStart((d) => addDays(d,  7)); }
  function goToCurrentWeek() { setViewWeekStart(weekStart); }

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
      {/* ── combined tab + mode bar ───────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        borderBottom: '1px solid var(--admin-border)',
        padding: '0 12px 0 16px',
        background: 'var(--admin-bg)',
        position: 'sticky', top: 52, zIndex: 9,
        height: 44,
        gap: 0,
      }}>
        {/* Overview / Calendar tabs */}
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
              padding: '0 12px',
              height: '100%',
              cursor: 'pointer',
              marginBottom: -1,
              textTransform: 'capitalize',
              WebkitTapHighlightColor: 'transparent',
              flexShrink: 0,
            }}
          >
            {t}
          </button>
        ))}

        {/* Day / Week mode toggle — right-aligned, before + New */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          {(['day', 'week'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setDayMode(m)}
              style={{
                fontFamily: 'var(--font-body)', fontSize: 11,
                fontWeight: dayMode === m ? 500 : 400,
                color: dayMode === m ? 'var(--admin-text)' : 'var(--admin-muted)',
                background: dayMode === m ? 'var(--admin-btn)' : 'none',
                border: dayMode === m ? '1px solid var(--admin-btn-border)' : '1px solid transparent',
                borderRadius: 5,
                padding: '3px 9px',
                cursor: 'pointer',
                textTransform: 'capitalize',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {m}
            </button>
          ))}

        </div>
      </div>

      {/* ── content ───────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && overviewMode === 'day'  && <DayView appointments={viewApts} date={viewDate} isToday={localDateStr(viewDate) === localDateStr(today)} onPrev={prevDay} onNext={nextDay} onGoToday={goToToday} isLoading={loadingApts} openDays={openDays} />}
      {activeTab === 'overview' && overviewMode === 'week' && <WeekView appointments={viewWeekApts} weekStart={viewWeekStart} isLoading={loadingWeek} onPrevWeek={prevWeek} onNextWeek={nextWeek} onGoCurrentWeek={goToCurrentWeek} openDays={openDays} />}
      {activeTab === 'calendar' && calendarMode === 'day'  && <DaySchedule appointments={viewApts} date={localDateStr(viewDate)} stickyTop={SUB_STICKY} isToday={localDateStr(viewDate) === localDateStr(today)} onPrev={prevDay} onNext={nextDay} onGoToday={goToToday} />}
      {activeTab === 'calendar' && calendarMode === 'week' && <WeekGridView appointments={viewWeekApts} weekStart={viewWeekStart} isLoading={loadingWeek} onPrevWeek={prevWeek} onNextWeek={nextWeek} onGoCurrentWeek={goToCurrentWeek} stickyTop={SUB_STICKY} openDays={openDays} />}
    </div>
  );
}
