'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Appointment } from '@/lib/admin-mock';
import DayView from './DayView';
import DaySchedule from './DaySchedule';
import WeekGridView from './WeekGridView';
import MonthView from './MonthView';

// stickyTop = just the AdminHeader height (52px) — no separate mode bar
const SUB_STICKY = 52;

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

const SCHEDULE_MODES = [
  { value: 'day',   label: 'Day'   },
  { value: 'week',  label: 'Week'  },
  { value: 'month', label: 'Month' },
] as const;

export default function DashboardTabs({
  todayApts,
  weekApts,
  todayStr,
  weekStartStr,
  openDays,
  hoursByDay,
  barberThuClose,
}: {
  todayApts: Appointment[];
  weekApts: Appointment[];
  todayStr: string;
  weekStartStr: string;
  openDays: Record<number, boolean>;
  hoursByDay?: Record<number, [number, number] | null>;
  barberThuClose?: number;
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

  const [activeTab,    setActiveTab]    = useState<'today' | 'schedule'>(initTab);
  const [scheduleMode, setScheduleMode] = useState<'day' | 'week' | 'month'>(initScheduleMode);

  const [viewDate,       setViewDate]       = useState<Date>(today);
  const [viewApts,       setViewApts]       = useState<Appointment[]>(todayApts);
  const [loadingApts,    setLoadingApts]    = useState(false);
  const [viewWeekStart,  setViewWeekStart]  = useState<Date>(weekStart);
  const [viewWeekApts,   setViewWeekApts]   = useState<Appointment[]>(weekApts);
  const [loadingWeek,    setLoadingWeek]    = useState(false);
  const [viewMonthStart, setViewMonthStart] = useState<Date>(() => monthStart(today));
  const [viewMonthApts,  setViewMonthApts]  = useState<Appointment[]>([]);
  const [loadingMonth,   setLoadingMonth]   = useState(false);

  useEffect(() => {
    if (localDateStr(viewDate) === localDateStr(today)) { setViewApts(todayApts); return; }
    setLoadingApts(true);
    fetch(`/api/admin/appointments?date=${localDateStr(viewDate)}`)
      .then(r => r.json()).then(d => setViewApts(Array.isArray(d) ? d : []))
      .catch(() => setViewApts([])).finally(() => setLoadingApts(false));
  }, [localDateStr(viewDate)]);

  useEffect(() => {
    if (localDateStr(viewWeekStart) === weekStartStr) { setViewWeekApts(weekApts); return; }
    const weekEnd = addDays(viewWeekStart, 6);
    setLoadingWeek(true);
    fetch(`/api/admin/appointments?start=${localDateStr(viewWeekStart)}&end=${localDateStr(weekEnd)}`)
      .then(r => r.json()).then(d => setViewWeekApts(Array.isArray(d) ? d : []))
      .catch(() => setViewWeekApts([])).finally(() => setLoadingWeek(false));
  }, [localDateStr(viewWeekStart)]);

  useEffect(() => {
    if (scheduleMode !== 'month') return;
    const y = viewMonthStart.getFullYear(), m = viewMonthStart.getMonth();
    const start = localDateStr(new Date(y, m, 1));
    const end   = localDateStr(new Date(y, m + 1, 0));
    setLoadingMonth(true);
    fetch(`/api/admin/appointments?start=${start}&end=${end}`)
      .then(r => r.json()).then(d => setViewMonthApts(Array.isArray(d) ? d : []))
      .catch(() => setViewMonthApts([])).finally(() => setLoadingMonth(false));
  }, [localDateStr(viewMonthStart), scheduleMode]);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'calendar' || t === 'schedule') {
      setActiveTab('schedule');
      const m = searchParams.get('mode');
      if (m === 'month') setScheduleMode('month');
      else if (m === 'week') setScheduleMode('week');
      else setScheduleMode('day');
    } else {
      setActiveTab('today');
    }
  }, [searchParams]);

  const prevDay    = () => setViewDate(d => addDays(d, -1));
  const nextDay    = () => setViewDate(d => addDays(d,  1));
  const goToToday  = () => setViewDate(today);
  const prevWeek   = () => setViewWeekStart(d => addDays(d, -7));
  const nextWeek   = () => setViewWeekStart(d => addDays(d,  7));
  const goToCurrentWeek = () => setViewWeekStart(weekStart);
  const prevMonth  = () => setViewMonthStart(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth  = () => setViewMonthStart(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  function handleMonthDayTap(dateStr: string) {
    setViewDate(strToLocalDate(dateStr));
    setScheduleMode('day');
  }

  // Mode toggle — connected glass pill, passed into each schedule view's nav bar
  const modeToggleNode = (
    <div style={{
      display: 'flex',
      background: 'var(--admin-glass-bg)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid var(--admin-glass-border)',
      borderRadius: 9999,
      overflow: 'hidden',
    }}>
      {SCHEDULE_MODES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => setScheduleMode(value)}
          style={{
            fontFamily: 'var(--font-body)', fontSize: 11,
            fontWeight: scheduleMode === value ? 600 : 400,
            color: scheduleMode === value ? 'var(--admin-text)' : 'var(--admin-muted)',
            background: scheduleMode === value ? 'var(--admin-btn)' : 'none',
            border: 'none',
            height: 32, padding: '0 11px',
            display: 'flex', alignItems: 'center',
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      {/* Today: always today's summary, no sub-header */}
      {activeTab === 'today' && (
        <DayView
          appointments={todayApts}
          date={today}
          isToday={true}
          openDays={openDays}
          hoursByDay={hoursByDay}
        />
      )}

      {/* Schedule: mode toggle lives inside each view's own nav row */}
      {activeTab === 'schedule' && scheduleMode === 'day' && (
        <DaySchedule
          appointments={viewApts}
          date={localDateStr(viewDate)}
          stickyTop={SUB_STICKY}
          isToday={localDateStr(viewDate) === localDateStr(today)}
          onPrev={prevDay}
          onNext={nextDay}
          onGoToday={goToToday}
          modeToggle={modeToggleNode}
          hoursByDay={hoursByDay}
          barberThuClose={barberThuClose}
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
          modeToggle={modeToggleNode}
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
          modeToggle={modeToggleNode}
        />
      )}
    </div>
  );
}
