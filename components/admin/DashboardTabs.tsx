'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Appointment } from '@/lib/admin-mock';
import DayView from './DayView';
import WeekView from './WeekView';
import DaySchedule from './DaySchedule';
import WeekGridView from './WeekGridView';
import MonthView from './MonthView';

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
  return new Date(y, m - 1, d);
}

function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default function DashboardTabs({
  todayApts,
  weekApts,
  todayStr,
  weekStartStr,
  openDays,
  hoursByDay,
}: {
  todayApts: Appointment[];
  weekApts: Appointment[];
  todayStr: string;
  weekStartStr: string;
  openDays: Record<number, boolean>;
  hoursByDay?: Record<number, [number, number] | null>;
}) {
  const today     = strToLocalDate(todayStr);
  const weekStart = strToLocalDate(weekStartStr);

  const searchParams = useSearchParams();

  function initTab(): 'overview' | 'calendar' {
    const t = searchParams.get('tab');
    if (t === 'calendar') return 'calendar';
    if (t === 'overview') return 'overview';
    if (searchParams.get('view') === 'grid') return 'calendar';
    return 'overview';
  }
  function initCalendarMode(): 'day' | 'week' | 'month' {
    if (searchParams.get('tab') === 'calendar' && searchParams.get('mode') === 'week') return 'week';
    if (searchParams.get('tab') === 'calendar' && searchParams.get('mode') === 'month') return 'month';
    return 'day';
  }

  const [activeTab,    setActiveTab]    = useState<'overview' | 'calendar'>(initTab);
  const [overviewMode, setOverviewMode] = useState<'day' | 'week' | 'month'>('day');
  const [calendarMode, setCalendarMode] = useState<'day' | 'week' | 'month'>(initCalendarMode);

  // Day navigation
  const [viewDate,    setViewDate]    = useState<Date>(today);
  const [viewApts,    setViewApts]    = useState<Appointment[]>(todayApts);
  const [loadingApts, setLoadingApts] = useState(false);

  // Week navigation
  const [viewWeekStart, setViewWeekStart] = useState<Date>(weekStart);
  const [viewWeekApts,  setViewWeekApts]  = useState<Appointment[]>(weekApts);
  const [loadingWeek,   setLoadingWeek]   = useState(false);

  // Month navigation
  const [viewMonthStart, setViewMonthStart] = useState<Date>(() => monthStart(today));
  const [viewMonthApts,  setViewMonthApts]  = useState<Appointment[]>([]);
  const [loadingMonth,   setLoadingMonth]   = useState(false);

  // Fetch day
  useEffect(() => {
    if (localDateStr(viewDate) === localDateStr(today)) {
      setViewApts(todayApts);
      return;
    }
    setLoadingApts(true);
    fetch(`/api/admin/appointments?date=${localDateStr(viewDate)}`)
      .then(r => r.json())
      .then(data => setViewApts(Array.isArray(data) ? data : []))
      .catch(() => setViewApts([]))
      .finally(() => setLoadingApts(false));
  }, [localDateStr(viewDate)]);

  // Fetch week
  useEffect(() => {
    if (localDateStr(viewWeekStart) === weekStartStr) {
      setViewWeekApts(weekApts);
      return;
    }
    const weekEnd = addDays(viewWeekStart, 6);
    setLoadingWeek(true);
    fetch(`/api/admin/appointments?start=${localDateStr(viewWeekStart)}&end=${localDateStr(weekEnd)}`)
      .then(r => r.json())
      .then(data => setViewWeekApts(Array.isArray(data) ? data : []))
      .catch(() => setViewWeekApts([]))
      .finally(() => setLoadingWeek(false));
  }, [localDateStr(viewWeekStart)]);

  // Fetch month
  useEffect(() => {
    if (calendarMode !== 'month' && overviewMode !== 'month') return;
    const y = viewMonthStart.getFullYear();
    const m = viewMonthStart.getMonth();
    const start = localDateStr(new Date(y, m, 1));
    const end   = localDateStr(new Date(y, m + 1, 0));
    setLoadingMonth(true);
    fetch(`/api/admin/appointments?start=${start}&end=${end}`)
      .then(r => r.json())
      .then(data => setViewMonthApts(Array.isArray(data) ? data : []))
      .catch(() => setViewMonthApts([]))
      .finally(() => setLoadingMonth(false));
  }, [localDateStr(viewMonthStart), calendarMode]);

  function prevDay()  { setViewDate(d => addDays(d, -1)); }
  function nextDay()  { setViewDate(d => addDays(d,  1)); }
  function goToToday() { setViewDate(today); }

  function prevWeek()        { setViewWeekStart(d => addDays(d, -7)); }
  function nextWeek()        { setViewWeekStart(d => addDays(d,  7)); }
  function goToCurrentWeek() { setViewWeekStart(weekStart); }

  function prevMonth() {
    setViewMonthStart(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    setViewMonthStart(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  // Tap a day in month view → switch to day schedule for that date
  function handleMonthDayTap(dateStr: string) {
    setViewDate(strToLocalDate(dateStr));
    setCalendarMode('day');
  }

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'calendar') setActiveTab('calendar');
    else if (t === 'overview') setActiveTab('overview');
    const mode = searchParams.get('mode');
    if (t === 'overview') setOverviewMode(mode === 'week' ? 'week' : 'day');
    if (t === 'calendar') {
      if (mode === 'month') setCalendarMode('month');
      else if (mode === 'week') setCalendarMode('week');
      else setCalendarMode('day');
    }
  }, [searchParams]);

  const dayMode    = activeTab === 'overview' ? overviewMode   : calendarMode;
  const setDayMode = activeTab === 'overview'
    ? (m: string) => setOverviewMode(m as 'day' | 'week' | 'month')
    : (m: string) => setCalendarMode(m as 'day' | 'week' | 'month');

  const modes = [
    { value: 'day',   label: 'Day'   },
    { value: 'week',  label: 'Week'  },
    { value: 'month', label: 'Month' },
  ];

  return (
    <div>
      {/* ── Tab + mode bar ────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '0 12px 0 16px',
        background: 'var(--admin-glass-bg)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid var(--admin-glass-border)',
        boxShadow: 'var(--admin-glass-shadow)',
        position: 'sticky', top: 52, zIndex: 9,
        height: 44, gap: 0,
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
              padding: '0 12px', height: '100%',
              cursor: 'pointer', marginBottom: -1,
              textTransform: 'capitalize',
              WebkitTapHighlightColor: 'transparent', flexShrink: 0,
            }}
          >
            {t}
          </button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
          {modes.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setDayMode(value)}
              style={{
                fontFamily: 'var(--font-body)', fontSize: 11,
                fontWeight: dayMode === value ? 500 : 400,
                color: dayMode === value ? 'var(--admin-text)' : 'var(--admin-muted)',
                background: dayMode === value ? 'var(--admin-btn)' : 'none',
                border: dayMode === value ? '1px solid var(--admin-btn-border)' : '1px solid transparent',
                borderRadius: 4,
                height: 44, padding: '0 9px',
                display: 'flex', alignItems: 'center',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && overviewMode === 'day'   && <DayView appointments={viewApts} date={viewDate} isToday={localDateStr(viewDate) === localDateStr(today)} onPrev={prevDay} onNext={nextDay} onGoToday={goToToday} isLoading={loadingApts} openDays={openDays} hoursByDay={hoursByDay} />}
      {activeTab === 'overview' && overviewMode === 'week'  && <WeekView appointments={viewWeekApts} weekStart={viewWeekStart} isLoading={loadingWeek} onPrevWeek={prevWeek} onNextWeek={nextWeek} onGoCurrentWeek={goToCurrentWeek} openDays={openDays} />}
      {activeTab === 'overview' && overviewMode === 'month' && (
        <MonthView
          appointments={viewMonthApts}
          monthStart={viewMonthStart}
          todayStr={todayStr}
          openDays={openDays}
          onDayTap={(dateStr) => { setViewDate(strToLocalDate(dateStr)); setOverviewMode('day'); }}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
          onRefresh={() => setViewMonthStart(d => new Date(d))}
          isLoading={loadingMonth}
        />
      )}
      {activeTab === 'calendar' && calendarMode === 'day'   && <DaySchedule appointments={viewApts} date={localDateStr(viewDate)} stickyTop={SUB_STICKY} isToday={localDateStr(viewDate) === localDateStr(today)} onPrev={prevDay} onNext={nextDay} onGoToday={goToToday} />}
      {activeTab === 'calendar' && calendarMode === 'week'  && <WeekGridView appointments={viewWeekApts} weekStart={viewWeekStart} isLoading={loadingWeek} onPrevWeek={prevWeek} onNextWeek={nextWeek} onGoCurrentWeek={goToCurrentWeek} stickyTop={SUB_STICKY} openDays={openDays} />}
      {activeTab === 'calendar' && calendarMode === 'month' && (
        <MonthView
          appointments={viewMonthApts}
          monthStart={viewMonthStart}
          todayStr={todayStr}
          openDays={openDays}
          onDayTap={handleMonthDayTap}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
          onRefresh={() => setViewMonthStart(d => new Date(d))}
          isLoading={loadingMonth}
        />
      )}
    </div>
  );
}
