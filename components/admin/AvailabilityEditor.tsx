'use client';

import { useState } from 'react';
import type { AvailabilityConfig, DayHours } from '@/lib/availability-store';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Hours available to pick: 6 AM – midnight
const HOUR_OPTIONS = Array.from({ length: 19 }, (_, i) => i + 6);

function fmtHour(h: number): string {
  if (h === 0 || h === 24) return '12 AM';
  if (h === 12) return '12 PM';
  if (h < 12) return `${h}:00 AM`;
  return `${h - 12}:00 PM`;
}

const selectStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  color: 'var(--admin-text)',
  background: 'var(--admin-bg)',
  border: '1px solid var(--admin-border)',
  borderRadius: 8,
  padding: '6px 8px',
  cursor: 'pointer',
  minWidth: 90,
};

export default function AvailabilityEditor({ initial }: { initial: AvailabilityConfig }) {
  const [days, setDays] = useState<Record<number, DayHours>>({ ...initial.days });
  const [barberThuClose, setBarberThuClose] = useState(initial.barberThuClose);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function toggleDay(d: number) {
    setDays((prev) => ({
      ...prev,
      [d]: prev[d] ? null : [10, 18],
    }));
    setSaved(false);
    setError('');
  }

  function setOpen(d: number, h: number) {
    const cur = days[d];
    const close = cur ? cur[1] : 18;
    setDays((prev) => ({ ...prev, [d]: [h, Math.max(close, h + 1)] }));
    setSaved(false);
    setError('');
  }

  function setClose(d: number, h: number) {
    const cur = days[d];
    const open = cur ? cur[0] : 10;
    setDays((prev) => ({ ...prev, [d]: [Math.min(open, h - 1), h] }));
    setSaved(false);
    setError('');
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days, barberThuClose }),
      });
      if (!res.ok) throw new Error('Save failed');
      const json = await res.json();
      setSaved(true);
      if (!json.persisted) {
        setError('Saved in memory — changes will reset on server restart. See setup note below.');
      }
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const thuOpen = !!days[4];

  return (
    <div style={{ padding: '24px 20px 64px' }}>
      <h1 style={{
        fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 400,
        color: 'var(--admin-text)', margin: '0 0 28px', letterSpacing: '-0.01em',
      }}>
        Availability
      </h1>

      {/* ── Weekly schedule ─────────────────────────────────────────── */}
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 12,
      }}>
        Weekly Schedule
      </div>

      <div style={{
        background: 'var(--admin-card)',
        border: '1px solid var(--admin-border)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {([0, 1, 2, 3, 4, 5, 6] as const).map((d, i) => {
          const hours = days[d];
          const isOpen = hours !== null;
          const openHour  = hours ? hours[0] : 10;
          const closeHour = hours ? hours[1] : 18;

          return (
            <div key={d} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 16px',
              borderBottom: i < 6 ? '1px solid var(--admin-border-sub)' : 'none',
              minHeight: 52,
            }}>
              {/* Day name */}
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: 14,
                color: 'var(--admin-text)',
                width: 86, flexShrink: 0,
              }}>
                {DAY_NAMES[d]}
              </span>

              {/* Open / Closed toggle chip */}
              <button
                onClick={() => toggleDay(d)}
                style={{
                  padding: '5px 11px',
                  borderRadius: 20,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  background: isOpen ? 'rgba(125,184,62,0.15)' : 'var(--admin-btn)',
                  color: isOpen ? '#7db83e' : 'var(--admin-muted)',
                  fontWeight: isOpen ? 500 : 400,
                  flexShrink: 0,
                  transition: 'background 0.15s, color 0.15s',
                  WebkitTapHighlightColor: 'transparent',
                  minWidth: 62, textAlign: 'center',
                }}
              >
                {isOpen ? 'Open' : 'Closed'}
              </button>

              {/* Time pickers — only shown when open */}
              {isOpen ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <select
                    value={openHour}
                    onChange={(e) => setOpen(d, Number(e.target.value))}
                    style={selectStyle}
                  >
                    {HOUR_OPTIONS.filter((h) => h < closeHour).map((h) => (
                      <option key={h} value={h}>{fmtHour(h)}</option>
                    ))}
                  </select>
                  <span style={{ color: 'var(--admin-muted)', fontSize: 13, flexShrink: 0 }}>–</span>
                  <select
                    value={closeHour}
                    onChange={(e) => setClose(d, Number(e.target.value))}
                    style={selectStyle}
                  >
                    {HOUR_OPTIONS.filter((h) => h > openHour).map((h) => (
                      <option key={h} value={h}>{fmtHour(h)}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <span style={{
                  fontFamily: 'var(--font-body)', fontSize: 13,
                  color: 'var(--admin-muted)', opacity: 0.4,
                }}>
                  —
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Special hours ────────────────────────────────────────────── */}
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--admin-muted)', margin: '28px 0 12px',
      }}>
        Special Hours
      </div>

      <div style={{
        background: 'var(--admin-card)',
        border: '1px solid var(--admin-border)',
        borderRadius: 12, overflow: 'hidden',
        opacity: thuOpen ? 1 : 0.45,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 14,
              color: 'var(--admin-text)', marginBottom: 3,
            }}>
              Barber — Thursday late close
            </div>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 12,
              color: 'var(--admin-muted)',
            }}>
              Extends barber bookings past the normal Thursday close
            </div>
          </div>
          <select
            value={barberThuClose}
            disabled={!thuOpen}
            onChange={(e) => { setBarberThuClose(Number(e.target.value)); setSaved(false); }}
            style={selectStyle}
          >
            {HOUR_OPTIONS.filter((h) => h > (days[4]?.[0] ?? 10)).map((h) => (
              <option key={h} value={h}>{fmtHour(h)}</option>
            ))}
          </select>
        </div>
      </div>

      {!thuOpen && (
        <p style={{
          marginTop: 8,
          fontFamily: 'var(--font-body)', fontSize: 12,
          color: 'var(--admin-muted)',
        }}>
          Enable Thursday above to use this setting.
        </p>
      )}

      {/* ── Save ─────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 28 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            padding: '14px',
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
            marginTop: 10,
            fontFamily: 'var(--font-body)', fontSize: 12,
            color: saved ? 'var(--admin-muted)' : 'var(--admin-error)',
            lineHeight: 1.5,
          }}>
            {error}
          </p>
        )}
      </div>

      <p style={{
        marginTop: 14,
        fontFamily: 'var(--font-body)', fontSize: 12,
        color: 'var(--admin-muted)', lineHeight: 1.5,
      }}>
        Changes take effect immediately on the booking calendar and live site.
      </p>
    </div>
  );
}
