'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Appointment } from '@/lib/admin-mock';
import DayView from './DayView';
import WeekView from './WeekView';
import WeekGridView from './WeekGridView';

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
  const [tab, setTab] = useState<'today' | 'week'>(
    searchParams.get('tab') === 'week' ? 'week' : 'today'
  );
  const [weekView, setWeekView] = useState<'list' | 'grid'>(
    searchParams.get('view') === 'grid' ? 'grid' : 'list'
  );

  useEffect(() => {
    if (searchParams.get('tab') === 'week') setTab('week');
    if (searchParams.get('view') === 'grid') setWeekView('grid');
    else if (searchParams.get('tab') === 'week') setWeekView('list');
  }, [searchParams]);

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: '1px solid #252320',
        padding: '0 20px',
        background: '#0d0c0a',
        position: 'sticky', top: 52, zIndex: 9,
      }}>
        {(['today', 'week'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: tab === t ? 500 : 400,
              color: tab === t ? '#ece9e2' : '#4a4844',
              background: 'none', border: 'none',
              borderBottom: tab === t ? '2px solid #ece9e2' : '2px solid transparent',
              padding: '12px 16px 10px',
              cursor: 'pointer',
              marginBottom: -1,
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}

        {/* Week view toggle — list vs grid */}
        {tab === 'week' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 2,
            marginLeft: 8, alignSelf: 'center',
          }}>
            {(['list', 'grid'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setWeekView(mode)}
                title={mode === 'list' ? 'List view' : 'Grid view'}
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  border: weekView === mode ? '1px solid #4a4844' : '1px solid transparent',
                  background: weekView === mode ? '#252320' : 'none',
                  color: weekView === mode ? '#ece9e2' : '#4a4844',
                  cursor: 'pointer', fontSize: 13, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 0,
                }}
              >
                {mode === 'list' ? '≡' : '⊞'}
              </button>
            ))}
          </div>
        )}

        {/* New booking button */}
        <a
          href="/admin/new-booking"
          style={{
            marginLeft: 'auto',
            display: 'flex', alignItems: 'center',
            fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500,
            color: '#ece9e2',
            background: '#252320',
            border: 'none', borderRadius: 6,
            padding: '5px 12px',
            textDecoration: 'none',
            alignSelf: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          + New
        </a>
      </div>

      {tab === 'today' && <DayView appointments={todayApts} date={today} />}
      {tab === 'week' && weekView === 'list' && <WeekView appointments={weekApts} weekStart={weekStart} />}
      {tab === 'week' && weekView === 'grid' && <WeekGridView appointments={weekApts} weekStart={weekStart} />}
    </div>
  );
}
