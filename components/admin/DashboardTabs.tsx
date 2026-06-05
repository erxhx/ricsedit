'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Appointment } from '@/lib/admin-mock';
import DayView from './DayView';
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

  function initTab(): 'today' | 'schedule' {
    const t = searchParams.get('tab');
    if (t === 'calendar' || t === 'schedule') return 'schedule';
    return 'today';
  }
  function initScheduleMode(): 'day' | 'week' | 'month' {
    const t = searchParams.get('tab');
    if (t === 'calendar' || t === 'schedule') {
      const m = searchParams.get('mode');
      if (m === 'week') return 'week';
      if (m === 'month') return 'month';
    }
    return 'day';
  }

  const [activeTab,     setActiveTab]     = useState<'today' | 'schedule'>(initTab);
  const [scheduleMode,  setScheduleMode]  = useState<'day' | 'week' | 'month'>(initScheduleMode);

  // Schedule day navigation
  const [viewDate,    setViewDate]    = useState<Date>(today);
  const [viewApts,    setViewApts]    = useState<Appointment[]>(weekApts.filter(a => localDateStr(today) === a.date) .length ? weekApts.filter(a => a.date === localDateStr(today)) : todayApts);
  const [loadingApts, setLoadingApts] = useState(false);

  // Schedule week navigation
  const [viewWeekStart, setViewWeekStart] = useState<Date>(weekStart);
  const [viewWeekApts,  setViewWeekApts]  = useState<Appointment[]>(weekApts);
  const [loadingWeek,   setLoadingWeek]   = useState(false);

  // Schedule month navigation
  const [viewMonthStart, setViewMonthStart] = useState<Date>(() => monthStart(today));
  const [viewMonthApts,  setViewMonthApts]  = useState<Appointment[]>([]);
  const [loadingMonth,   setLoadingMonth]   = useState(false);

  // Fetch day for Schedule
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

  // Fetch month — only for Schedule month mode
  useEffect(() => {
    if (scheduleMode !== 'month') return;
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
  }, [localDateStr(viewMonthStart), scheduleMode]);

  function prevDay()         { setViewDate(d => addDays(d, -1)); }
  function nextDay()         { setViewDate(d => addDays(d,  1)); }
  function goToToday()       { setViewDate(today); }
  function prevWeek()        { setViewWeekStart(d => addDays(d, -7)); }
  function nextWeek()        { setViewWeekStart(d => addDays(d,  7)); }
  function goToCurrentWeek() { setViewWeekStart(weekStart); }
  function prevMonth()       { setViewMonthStart(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); }
  function nextMonth()       { setViewMonthStart(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); }

  // Tapping a day in month view → switch to day schedule for that date
  function handleMonthDayTap(dateStr: string) {
    setViewDate(strToLocalDate(dateStr));
    setScheduleMode('day');
  }

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'calendar' || t === 'schedule') {
      setActiveTab('schedule');
      const m = searchParams.get('mode');
      if (m === 'month') setScheduleMode('month');
      else if (m === 'week') setScheduleMode('week');
      else setScheduleMode('day');
    } else if (t === 'overview' || t === 'today') {
      setActiveTab('today');
    }
  }, [searchParams]);

  const SCHEDULE_MODES = [
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
        {/* Tab buttons */}
        {([
          { value: 'today',    label: 'Today'    },
          { value: 'schedule', label: 'Schedule' },
        ] as const).map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            style={{
              fontFamily: 'var(--font-body)', fontSize: 13,
              fontWeight: activeTab === value ? 500 : 400,
              color: activeTab === value ? 'var(--admin-text)' : 'var(--admin-muted)',
              background: 'none', border: 'none',
              borderBottom: activeTab === value ? '2px solid var(--admin-text)' : '2px solid transparent',
              padding: '0 12px', height: '100%',
              cursor: 'pointer', marginBottom: -1,
              WebkitTapHighlightColor: 'transparent', flexShrink: 0,
            }}
          >
            {label}
          </button>
        ))}

        {/* Mode toggle — Schedule tab only */}
        {activeTab === 'schedule' && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
            {SCHEDULE_MODES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setScheduleMode(value as 'day' | 'week' | 'month')}
                style={{
                  fontFamily: 'var(--font-body)', fontSize: 11,
                  fontWeight: scheduleMode === value ? 500 : 400,
                  color: scheduleMode === value ? 'var(--admin-text)' : 'var(--admin-muted)',
                  background: scheduleMode === value ? 'var(--admin-btn)' : 'none',
                  border: scheduleMode === value ? '1px solid var(--admin-btn-border)' : '1px solid transparent',
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
        )}
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}

      {/* Today: always today's summary, no navigation */}
      {activeTab === 'today' && (
        <DayView
          appointments={todayApts}
          date={today}
          isToday={true}
          openDays={openDays}
          hoursByDay={hoursByDay}
        />
      )}

      {/* Schedule: full navigation, day/week/month grid */}
      {activeTab === 'schedule' && scheduleMode === 'day' && (
        <DaySchedule
          appointments={viewApts}
          date={localDateStr(viewDate)}
          stickyTop={SUB_STICKY}
          isToday={localDateStr(viewDate) === localDateStr(today)}
          onPrev={prevDay}
          onNext={nextDay}
          onGoToday={goToToday}
        />
      )}
      {activeTab === 'schedule' && scheduleMode === 'week' && (
        <WeekGridView
          appointments={viewWeekApts}
          weekStart={viewWeekStart}
          isLoading={loadingWeek}
          onPrevWeek={prevWeek}
          onNextWeek={nextWeek}
          onGoCurrentWeek={goToCurrentWeek}
          stickyTop={SUB_STICKY}
          openDays={openDays}
        />
      )}
      {activeTab === 'schedule' && scheduleMode === 'month' && (
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
