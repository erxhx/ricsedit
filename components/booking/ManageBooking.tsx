'use client';
import { useState, useEffect } from 'react';
import type { Appointment } from '@/lib/admin-mock';

type View = 'view' | 'reschedule' | 'cancel' | 'rescheduled' | 'cancelled';

const STAFF_LABEL: Record<string, string> = { eric: 'Eric', livi: 'Livi' };
const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr}:${String(m).padStart(2, '0')} ${period}`;
}

function fmtDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function fmtDateShort(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric',
  });
}

function addMinutes(t: string, mins: number): string {
  const [h, m] = t.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayPacific(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Vancouver',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

type DayHours = [number, number] | null;

interface HoursConfig {
  days: Record<number, DayHours>;
  barberThuClose?: number;
  staff?: {
    eric?: { days?: Record<number, DayHours> };
    livi?: { days?: Record<number, DayHours> };
  };
}

interface BookedRange {
  startMinutes: number;
  durationMinutes: number;
}

/** Returns [openMinutes, closeMinutes] for a staff member on a given day-of-week, or null if closed. */
function getStaffHours(
  config: HoursConfig,
  staff: string,
  dow: number,
): [number, number] | null {
  const staffDays = config.staff?.[staff as 'eric' | 'livi']?.days ?? config.days;
  const hours = staffDays[dow] as DayHours ?? null;
  if (!hours) return null;
  let [open, close] = hours;
  // Barber Thursday special close
  if (staff === 'eric' && dow === 4 && config.barberThuClose) close = config.barberThuClose;
  return [open * 60, close * 60];
}

/** Current time in minutes from midnight, Pacific time. */
function nowMinsPacific(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Vancouver', hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(new Date());
  const h = parseInt(parts.find(p => p.type === 'hour')!.value, 10) % 24;
  const m = parseInt(parts.find(p => p.type === 'minute')!.value, 10);
  return h * 60 + m;
}

/** Compute available start times (in minutes from midnight) — exact port of the live booking.jsx logic. */
function computeSlots(
  openMin: number,
  closeMin: number,
  duration: number,
  booked: BookedRange[],
  isBarber: boolean,
  excludeStart?: number, // current appointment's own slot — exclude from busy ranges
): number[] {
  const step     = isBarber ? 45 : 15;
  const deadline = closeMin + (isBarber ? 15 : 0); // barber has 15-min grace past close

  // Filter out the client's own current appointment so they can re-select it
  const ranges = booked.filter(r => r.startMinutes !== excludeStart);
  const sorted = [...ranges].sort((a, b) => a.startMinutes - b.startMinutes);

  const slots: number[] = [];
  let cursor = openMin;

  while (cursor + duration <= deadline) {
    // If cursor lands inside a booked range, jump to its end
    let jumped = false;
    for (const r of sorted) {
      if (cursor >= r.startMinutes && cursor < r.startMinutes + r.durationMinutes) {
        cursor = r.startMinutes + r.durationMinutes;
        jumped = true;
        break;
      }
    }
    if (jumped) continue;

    // Check if the proposed slot overlaps any booked range
    let overlapEnd = -1;
    for (const r of sorted) {
      if (cursor < r.startMinutes + r.durationMinutes && cursor + duration > r.startMinutes) {
        overlapEnd = r.startMinutes + r.durationMinutes;
        break;
      }
    }

    if (overlapEnd >= 0) {
      cursor = overlapEnd;
    } else {
      slots.push(cursor);
      cursor += step;
    }
  }

  return slots;
}

function minToTime(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// ── Reschedule step ───────────────────────────────────────────────────────────

function RescheduleStep({
  apt,
  onConfirm,
  onBack,
  loading,
  error,
}: {
  apt: Appointment;
  onConfirm: (date: string, time: string) => void;
  onBack: () => void;
  loading: boolean;
  error: string;
}) {
  const today = todayPacific();
  const [y0, m0] = today.split('-').map(Number);

  const [viewYear,  setViewYear]  = useState(y0);
  const [viewMonth, setViewMonth] = useState(m0 - 1); // 0-indexed
  const [selDate,   setSelDate]   = useState('');
  const [selTime,   setSelTime]   = useState('');
  const [hours,     setHours]     = useState<HoursConfig | null>(null);
  const [booked,    setBooked]    = useState<BookedRange[]>([]);
  const [slots,     setSlots]     = useState<number[]>([]);
  const [fetching,  setFetching]  = useState(false);

  // Current appointment's start in minutes (to exclude from busy)
  const [curH, curM] = apt.startTime.split(':').map(Number);
  const currentAptStart = apt.date === selDate ? curH * 60 + curM : -1;

  // Fetch studio hours on mount
  useEffect(() => {
    fetch('/api/booking/hours')
      .then(r => r.json())
      .then(setHours)
      .catch(() => {});
  }, []);

  // Fetch availability when date changes
  useEffect(() => {
    if (!selDate) { setSlots([]); return; }
    setFetching(true);
    fetch(`/api/booking/availability?date=${selDate}&staff=${apt.staff}`)
      .then(r => r.json())
      .then((data: { bookedRanges: BookedRange[] }) => {
        setBooked(data.bookedRanges ?? []);
      })
      .catch(() => setBooked([]))
      .finally(() => setFetching(false));
  }, [selDate, apt.staff]);

  // Recompute slots when booked or hours changes
  useEffect(() => {
    if (!selDate || !hours) { setSlots([]); return; }
    const [y, m, d] = selDate.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    const h = getStaffHours(hours, apt.staff, dow);
    if (!h) { setSlots([]); return; }
    const isBarber = apt.staff === 'eric';
    let s = computeSlots(h[0], h[1], apt.durationMinutes, booked, isBarber, currentAptStart);
    // Filter out past slots when viewing today (Pacific time)
    if (selDate === today) {
      const nowMins = nowMinsPacific();
      s = s.filter(min => min > nowMins);
    }
    setSlots(s);
    if (!s.includes(selTime ? (parseInt(selTime.split(':')[0]) * 60 + parseInt(selTime.split(':')[1])) : -1)) {
      setSelTime('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booked, hours, selDate]);

  // Build calendar grid for current view month
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // 60-day max booking window (same as live site)
  const maxDateStr = toDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 60));

  function isDayAvailable(day: number): boolean {
    if (!hours) return false;
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (dateStr < today) return false;
    if (dateStr > maxDateStr) return false;
    const dow = new Date(viewYear, viewMonth, day).getDay();
    return getStaffHours(hours, apt.staff, dow) !== null;
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  // Disable prev if already showing current month
  const canPrev = viewYear > y0 || viewMonth > m0 - 1;

  const selectedTimeMin = selTime
    ? parseInt(selTime.split(':')[0]) * 60 + parseInt(selTime.split(':')[1])
    : -1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          style={{ fontSize: 13, opacity: 0.5, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 10 }}
        >
          ← Back
        </button>
        <h1 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 26, fontWeight: 300, margin: 0 }}>
          Reschedule
        </h1>
        <p style={{ fontSize: 13, opacity: 0.5, margin: '4px 0 0' }}>
          Currently {fmtDate(apt.date)} at {fmtTime(apt.startTime)}
        </p>
      </div>

      {/* Calendar */}
      <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16, overflow: 'hidden' }}>
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <button
            onClick={prevMonth}
            disabled={!canPrev}
            style={{ background: 'none', border: 'none', cursor: canPrev ? 'pointer' : 'default', fontSize: 16, opacity: canPrev ? 0.6 : 0.2, padding: '0 4px' }}
          >
            ‹
          </button>
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.6, padding: '0 4px' }}
          >
            ›
          </button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px 8px 0' }}>
          {DAY_ABBR.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.35, padding: '4px 0' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '4px 8px 12px', gap: 2 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const available = isDayAvailable(day);
            const isSelected = dateStr === selDate;
            const isPast = dateStr < today;
            return (
              <button
                key={dateStr}
                onClick={() => { if (available) { setSelDate(dateStr); setSelTime(''); } }}
                disabled={!available}
                style={{
                  height: 36, borderRadius: 8,
                  background: isSelected ? '#141210' : 'none',
                  color: isSelected ? '#efeae0' : isPast || !available ? 'rgba(0,0,0,0.2)' : '#141210',
                  border: 'none', cursor: available ? 'pointer' : 'default',
                  fontSize: 13, fontWeight: isSelected ? 500 : 400,
                  textDecoration: available && !isSelected ? 'underline' : 'none',
                  textUnderlineOffset: 2,
                  textDecorationColor: 'rgba(0,0,0,0.2)',
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      {selDate && (
        <div>
          <p style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.4, margin: '0 0 10px' }}>
            {fmtDateShort(selDate)}
          </p>
          {fetching ? (
            <p style={{ fontSize: 13, opacity: 0.4 }}>Loading availability…</p>
          ) : slots.length === 0 ? (
            <p style={{ fontSize: 13, opacity: 0.4 }}>No availability on this day — pick another date.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {slots.map(s => {
                const timeStr = minToTime(s);
                const isSelected = s === selectedTimeMin;
                return (
                  <button
                    key={s}
                    onClick={() => setSelTime(timeStr)}
                    style={{
                      padding: '10px 0', borderRadius: 10,
                      background: isSelected ? '#141210' : 'rgba(0,0,0,0.04)',
                      color: isSelected ? '#efeae0' : '#141210',
                      border: isSelected ? 'none' : '1px solid rgba(0,0,0,0.08)',
                      fontSize: 13, fontWeight: isSelected ? 500 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {fmtTime(timeStr)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Duration hint */}
      {selDate && selTime && (
        <p style={{ fontSize: 12, opacity: 0.35, textAlign: 'center', margin: '-4px 0' }}>
          {fmtTime(selTime)} – {fmtTime(addMinutes(selTime, apt.durationMinutes))} · {apt.durationMinutes} min
        </p>
      )}

      {error && <p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p>}

      <button
        onClick={() => selDate && selTime && onConfirm(selDate, selTime)}
        disabled={!selDate || !selTime || loading}
        style={{
          width: '100%', padding: '16px 0', borderRadius: 16,
          background: selDate && selTime ? '#141210' : 'rgba(0,0,0,0.06)',
          color: selDate && selTime ? '#efeae0' : 'rgba(0,0,0,0.25)',
          border: 'none', fontSize: 14, fontWeight: 500,
          cursor: selDate && selTime ? 'pointer' : 'default',
          transition: 'all 0.15s',
        }}
      >
        {loading ? 'Saving…' : selDate && selTime
          ? `Move to ${fmtDateShort(selDate)} at ${fmtTime(selTime)}`
          : 'Select a date and time'}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ManageBooking({
  apt: initial,
  token,
}: {
  apt: Appointment;
  token: string;
}) {
  const [apt, setApt] = useState(initial);
  const [view, setView] = useState<View>('view');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const today = todayPacific();
  const isPast = apt.date < today;
  const isActive = apt.status === 'confirmed' && !isPast;

  async function doCancel() {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/booking/manage/${token}/cancel`, { method: 'POST' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed to cancel'); }
      setApt(a => ({ ...a, status: 'cancelled' }));
      setView('cancelled');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally { setLoading(false); }
  }

  async function doReschedule(date: string, time: string) {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/booking/manage/${token}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, startTime: time }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed to reschedule'); }
      const newEnd = addMinutes(time, apt.durationMinutes);
      setApt(a => ({ ...a, date, startTime: time, endTime: newEnd }));
      setView('rescheduled');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally { setLoading(false); }
  }

  // ── Rescheduled ───────────────────────────────────────────────────────────
  if (view === 'rescheduled') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>✓</div>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 26, fontWeight: 300, margin: '0 0 4px' }}>Appointment moved</h1>
        <p style={{ fontSize: 13, opacity: 0.5, margin: 0 }}>
          Your {apt.service} has been rescheduled to <strong style={{ fontWeight: 500, opacity: 1 }}>{fmtDate(apt.date)}</strong> at <strong style={{ fontWeight: 500, opacity: 1 }}>{fmtTime(apt.startTime)}</strong>.
        </p>
      </div>
      <AppointmentCard apt={apt} />
      <a href="/book" style={{ fontSize: 13, opacity: 0.4, textDecoration: 'none' }}>Book another appointment →</a>
    </div>
  );

  // ── Cancelled ─────────────────────────────────────────────────────────────
  if (view === 'cancelled') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>✓</div>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 26, fontWeight: 300, margin: '0 0 4px' }}>Appointment cancelled</h1>
        <p style={{ fontSize: 13, opacity: 0.5, margin: 0 }}>Your {apt.service} on {fmtDate(apt.date)} has been cancelled.</p>
      </div>
      <a href="/book" style={{ fontSize: 13, opacity: 0.4, textDecoration: 'none' }}>Book a new appointment →</a>
    </div>
  );

  // ── Cancel confirm ────────────────────────────────────────────────────────
  if (view === 'cancel') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <button onClick={() => { setView('view'); setError(''); }} style={{ fontSize: 13, opacity: 0.5, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 10 }}>← Back</button>
        <h1 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 26, fontWeight: 300, margin: 0 }}>Cancel appointment?</h1>
      </div>
      <AppointmentCard apt={apt} />
      <p style={{ fontSize: 13, opacity: 0.5 }}>This will permanently cancel your {apt.service} on {fmtDate(apt.date)} at {fmtTime(apt.startTime)}. This cannot be undone.</p>
      {error && <p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={doCancel} disabled={loading} style={{ width: '100%', padding: '16px 0', borderRadius: 16, background: '#fef2f2', color: '#dc2626', border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
          {loading ? 'Cancelling…' : 'Yes, cancel it'}
        </button>
        <button onClick={() => { setView('view'); setError(''); }} style={{ width: '100%', padding: '16px 0', borderRadius: 16, background: 'none', border: '1px solid rgba(0,0,0,0.1)', fontSize: 14, cursor: 'pointer' }}>
          Keep appointment
        </button>
      </div>
    </div>
  );

  // ── Reschedule ────────────────────────────────────────────────────────────
  if (view === 'reschedule') return (
    <RescheduleStep
      apt={apt}
      onConfirm={doReschedule}
      onBack={() => { setView('view'); setError(''); }}
      loading={loading}
      error={error}
    />
  );

  // ── Default view ──────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 26, fontWeight: 300, margin: '0 0 4px' }}>Your appointment</h1>
        <p style={{ fontSize: 13, opacity: 0.5, margin: 0 }}>{apt.clientName}</p>
      </div>

      <AppointmentCard apt={apt} />

      {apt.status === 'cancelled' && <p style={{ fontSize: 13, textAlign: 'center', opacity: 0.5 }}>This appointment has been cancelled.</p>}
      {apt.status === 'completed' && <p style={{ fontSize: 13, textAlign: 'center', opacity: 0.5 }}>This appointment has been completed.</p>}
      {isPast && apt.status === 'confirmed' && <p style={{ fontSize: 13, textAlign: 'center', opacity: 0.5 }}>This appointment has already passed.</p>}

      {isActive && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => setView('reschedule')} style={{ width: '100%', padding: '16px 0', borderRadius: 16, background: 'none', border: '1px solid rgba(0,0,0,0.1)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            Reschedule
          </button>
          <button onClick={() => setView('cancel')} style={{ width: '100%', padding: '16px 0', borderRadius: 16, background: 'none', border: 'none', fontSize: 14, color: '#dc2626', cursor: 'pointer' }}>
            Cancel appointment
          </button>
        </div>
      )}

      {isActive && (
        <p style={{ fontSize: 11, opacity: 0.3, textAlign: 'center' }}>
          You can reschedule or cancel up to 24 hours before your appointment.
        </p>
      )}
    </div>
  );
}

// ── Appointment card ──────────────────────────────────────────────────────────

function AppointmentCard({ apt }: { apt: Appointment }) {
  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{apt.service}</p>
        <p style={{ fontSize: 12, opacity: 0.4, margin: '2px 0 0' }}>with {STAFF_LABEL[apt.staff] ?? apt.staff}</p>
      </div>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{fmtDate(apt.date)}</p>
        <p style={{ fontSize: 13, opacity: 0.5, margin: '2px 0 0' }}>{fmtTime(apt.startTime)} – {fmtTime(apt.endTime)} · {apt.durationMinutes} min</p>
      </div>
      <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, opacity: 0.5 }}>Total</span>
        <span style={{ fontSize: 14, fontWeight: 500 }}>${apt.price}</span>
      </div>
    </div>
  );
}
