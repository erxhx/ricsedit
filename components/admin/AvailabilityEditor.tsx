'use client';

import { useState } from 'react';
import type { AvailabilityConfig, DayHours } from '@/lib/availability-store';
import { STAFF as ROSTER } from '@/lib/staff';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOUR_OPTIONS = Array.from({ length: 19 }, (_, i) => i + 6); // 6 AM – midnight

function fmtHour(h: number): string {
  if (h === 0 || h === 24) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
}

const selectStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: 13,
  color: 'var(--admin-text)', background: 'var(--admin-bg)',
  border: '1px solid var(--admin-border)', borderRadius: 8,
  padding: '6px 8px', cursor: 'pointer', minWidth: 90,
};

// ── Reusable 7-day schedule grid ──────────────────────────────────────────────

function WeekGrid({
  days,
  onChange,
}: {
  days: Record<number, DayHours>;
  onChange: (d: number, hours: DayHours) => void;
}) {
  return (
    <div style={{
      background: 'var(--admin-card)',
      border: '1px solid var(--admin-border)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      {([0, 1, 2, 3, 4, 5, 6] as const).map((d, i) => {
        const hours     = days[d];
        const isOpen    = hours !== null;
        const openHour  = hours ? hours[0] : 10;
        const closeHour = hours ? hours[1] : 18;

        return (
          <div key={d} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 16px', minHeight: 52,
            borderBottom: i < 6 ? '1px solid var(--admin-border-sub)' : 'none',
          }}>
            {/* Day name */}
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: 14,
              color: 'var(--admin-text)', width: 86, flexShrink: 0,
            }}>
              {DAY_NAMES[d]}
            </span>

            {/* Toggle chip */}
            <button
              onClick={() => onChange(d, isOpen ? null : [10, 18])}
              style={{
                padding: '5px 11px', borderRadius: 20, border: 'none',
                cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12,
                background: isOpen ? 'rgba(125,184,62,0.15)' : 'var(--admin-btn)',
                color: isOpen ? '#7db83e' : 'var(--admin-muted)',
                fontWeight: isOpen ? 500 : 400,
                flexShrink: 0, minWidth: 62, textAlign: 'center',
                transition: 'background 0.15s, color 0.15s',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isOpen ? 'On' : 'Off'}
            </button>

            {isOpen ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <select
                  value={openHour}
                  onChange={(e) => {
                    const h = Number(e.target.value);
                    onChange(d, [h, Math.max(closeHour, h + 1)]);
                  }}
                  style={selectStyle}
                >
                  {HOUR_OPTIONS.filter(h => h < closeHour).map(h => (
                    <option key={h} value={h}>{fmtHour(h)}</option>
                  ))}
                </select>
                <span style={{ color: 'var(--admin-muted)', fontSize: 13, flexShrink: 0 }}>–</span>
                <select
                  value={closeHour}
                  onChange={(e) => {
                    const h = Number(e.target.value);
                    onChange(d, [Math.min(openHour, h - 1), h]);
                  }}
                  style={selectStyle}
                >
                  {HOUR_OPTIONS.filter(h => h > openHour).map(h => (
                    <option key={h} value={h}>{fmtHour(h)}</option>
                  ))}
                </select>
              </div>
            ) : (
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: 13,
                color: 'var(--admin-muted)', opacity: 0.4,
              }}>—</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main editor ───────────────────────────────────────────────────────────────

export default function AvailabilityEditor({ initial }: { initial: AvailabilityConfig }) {
  const [storeDays, setStoreDays]         = useState<Record<number, DayHours>>({ ...initial.days });
  const [barberThuClose, setBarberThuClose] = useState(initial.barberThuClose);
  const [staffDays, setStaffDays] = useState<Record<string, Record<number, DayHours>>>(
    () => Object.fromEntries(
      ROSTER.map(m => [m.id, { ...(initial.staff[m.id]?.days ?? initial.days) }]),
    ),
  );
  const [activeStaff, setActiveStaff]     = useState<string>(ROSTER[0].id);

  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [error,  setError]    = useState('');

  function touch() { setSaved(false); setError(''); }

  function updateStoreDays(d: number, hours: DayHours) {
    setStoreDays(prev => ({ ...prev, [d]: hours })); touch();
  }
  function updateActiveStaff(d: number, hours: DayHours) {
    setStaffDays(prev => ({ ...prev, [activeStaff]: { ...prev[activeStaff], [d]: hours } }));
    touch();
  }

  async function handleSave() {
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/admin/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days: storeDays,
          barberThuClose,
          staff: Object.fromEntries(ROSTER.map(m => [m.id, { days: staffDays[m.id] }])),
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      const json = await res.json();
      setSaved(true);
      if (!json.persisted) {
        setError('Saved in memory only — run the settings SQL in Supabase to persist across restarts.');
      }
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const thuOpen = !!storeDays[4];
  const activeStaffDays = staffDays[activeStaff] ?? {};

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '10px 0',
    fontFamily: 'var(--font-body)', fontSize: 14,
    fontWeight: active ? 500 : 400,
    color: active ? 'var(--admin-text)' : 'var(--admin-text3)',
    background: active ? 'var(--admin-nav-active)' : 'transparent',
    border: 'none',
    borderBottom: `2px solid ${active ? '#7db83e' : 'transparent'}`,
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s, border-color 0.15s',
    WebkitTapHighlightColor: 'transparent',
  });

  return (
    <div style={{ padding: '24px 20px 64px' }}>
      <h1 style={{
        fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 400,
        color: 'var(--admin-text)', margin: '0 0 28px', letterSpacing: '-0.01em',
      }}>
        Availability
      </h1>

      {/* ── Store hours ──────────────────────────────────────── */}
      <SectionLabel>Store Hours</SectionLabel>
      <WeekGrid days={storeDays} onChange={updateStoreDays} />
      <p style={{ marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)', lineHeight: 1.5 }}>
        Controls the Open / Closed indicator on the live site.
      </p>

      {/* ── Special hours ─────────────────────────────────────── */}
      <SectionLabel style={{ marginTop: 28 }}>Special Hours</SectionLabel>
      <div style={{
        background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
        borderRadius: 12, overflow: 'hidden',
        opacity: thuOpen ? 1 : 0.45,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)', marginBottom: 3 }}>
              Barber — Thursday late close
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)' }}>
              Extends barber bookings past Eric&apos;s normal Thursday close
            </div>
          </div>
          <select
            value={barberThuClose}
            disabled={!thuOpen}
            onChange={(e) => { setBarberThuClose(Number(e.target.value)); touch(); }}
            style={selectStyle}
          >
            {HOUR_OPTIONS.filter(h => h > (storeDays[4]?.[0] ?? 10)).map(h => (
              <option key={h} value={h}>{fmtHour(h)}</option>
            ))}
          </select>
        </div>
      </div>
      {!thuOpen && (
        <p style={{ marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)' }}>
          Enable Thursday in Store Hours above to use this setting.
        </p>
      )}

      {/* ── Staff schedules ───────────────────────────────────── */}
      <SectionLabel style={{ marginTop: 28 }}>Staff Schedules</SectionLabel>
      <p style={{ marginTop: -6, marginBottom: 12, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)', lineHeight: 1.5 }}>
        Controls which days each person is actually bookable — independent of store hours.
      </p>

      {/* Staff tabs */}
      <div style={{
        display: 'flex',
        background: 'var(--admin-card)',
        border: '1px solid var(--admin-border)',
        borderRadius: '12px 12px 0 0',
        borderBottom: 'none',
        overflow: 'hidden',
      }}>
        {ROSTER.map((m, i) => (
          <span key={m.id} style={{ display: 'flex', flex: 1 }}>
            {i > 0 && <div style={{ width: 1, background: 'var(--admin-border)' }} />}
            <button style={tabStyle(activeStaff === m.id)} onClick={() => setActiveStaff(m.id)}>
              {m.name}
            </button>
          </span>
        ))}
      </div>

      {/* Staff days grid — shares styling with store hours grid but rounded top removed */}
      <div style={{ borderRadius: '0 0 12px 12px', overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
        <WeekGrid days={activeStaffDays} onChange={updateActiveStaff} />
      </div>

      <p style={{ marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)', lineHeight: 1.5 }}>
        {`Bookings only show on days ${ROSTER.find(m => m.id === activeStaff)?.name ?? 'this person'} is on.`}
      </p>

      {/* ── Save ─────────────────────────────────────────────── */}
      <div style={{ marginTop: 28 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '14px',
            background: saved && !error ? '#7db83e' : 'var(--admin-btn-primary-bg)',
            color: saved && !error ? '#fff' : 'var(--admin-btn-primary-fg)',
            fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
            border: 'none', borderRadius: 12,
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.7 : 1,
            transition: 'background 0.2s, color 0.2s',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </button>

        {error && (
          <p style={{
            marginTop: 10, fontFamily: 'var(--font-body)', fontSize: 12,
            color: saved ? 'var(--admin-muted)' : 'var(--admin-error)', lineHeight: 1.5,
          }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 12,
      ...style,
    }}>
      {children}
    </div>
  );
}
