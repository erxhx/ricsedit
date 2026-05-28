'use client';
import { useState } from 'react';
import type { Appointment } from '@/lib/admin-mock';

type View = 'view' | 'reschedule' | 'cancel' | 'rescheduled' | 'cancelled';

const STAFF_LABEL: Record<string, string> = { eric: 'Eric', livi: 'Livi' };

const TIME_SLOTS: string[] = [];
for (let h = 9; h <= 19; h++) {
  for (let m = 0; m < 60; m += 15) {
    if (h === 19 && m > 0) break;
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

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

function fmtDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function addMinutes(t: string, mins: number): string {
  const [h, m] = t.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export default function ManageBooking({
  apt: initial,
  token,
}: {
  apt: Appointment;
  token: string;
}) {
  const [apt, setApt] = useState(initial);
  const [view, setView] = useState<View>('view');
  const [reschedDate, setReschedDate] = useState(initial.date);
  const [reschedTime, setReschedTime] = useState(initial.startTime);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const isPast = apt.date < today;
  const isActive = apt.status === 'confirmed' && !isPast;

  async function doCancel() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/booking/manage/${token}/cancel`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to cancel');
      }
      setApt((a) => ({ ...a, status: 'cancelled' }));
      setView('cancelled');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function doReschedule() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/booking/manage/${token}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: reschedDate, startTime: reschedTime }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to reschedule');
      }
      const newEnd = addMinutes(reschedTime, apt.durationMinutes);
      setApt((a) => ({ ...a, date: reschedDate, startTime: reschedTime, endTime: newEnd }));
      setView('rescheduled');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Success: rescheduled ──────────────────────────────────────────────────
  if (view === 'rescheduled') {
    return (
      <div className="flex flex-col gap-6">
        <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center text-xl">
          ✓
        </div>
        <div>
          <h1 className="text-2xl mb-1">Appointment moved</h1>
          <p className="text-sm opacity-60">
            Your {apt.service} has been rescheduled to{' '}
            <strong className="font-medium opacity-100">{fmtDate(apt.date)}</strong> at{' '}
            <strong className="font-medium opacity-100">{fmtTime(apt.startTime)}</strong>.
          </p>
        </div>
        <AppointmentCard apt={apt} />
        <a href="/book" className="text-sm opacity-40 hover:opacity-70 transition-opacity">
          Book another appointment →
        </a>
      </div>
    );
  }

  // ── Success: cancelled ────────────────────────────────────────────────────
  if (view === 'cancelled') {
    return (
      <div className="flex flex-col gap-6">
        <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center text-xl">
          ✓
        </div>
        <div>
          <h1 className="text-2xl mb-1">Appointment cancelled</h1>
          <p className="text-sm opacity-60">
            Your {apt.service} on {fmtDate(apt.date)} has been cancelled.
          </p>
        </div>
        <a href="/book" className="text-sm opacity-40 hover:opacity-70 transition-opacity">
          Book a new appointment →
        </a>
      </div>
    );
  }

  // ── Cancel confirmation ───────────────────────────────────────────────────
  if (view === 'cancel') {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <button
            onClick={() => { setView('view'); setError(''); }}
            className="text-sm opacity-50 hover:opacity-80 transition-opacity mb-3"
          >
            ← Back
          </button>
          <h1 className="text-2xl">Cancel appointment?</h1>
        </div>

        <AppointmentCard apt={apt} />

        <p className="text-sm opacity-50">
          This will permanently cancel your {apt.service} on {fmtDate(apt.date)} at{' '}
          {fmtTime(apt.startTime)}. This cannot be undone.
        </p>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex flex-col gap-3">
          <button
            onClick={doCancel}
            disabled={loading}
            className="w-full py-4 rounded-2xl text-sm font-medium bg-red-50 text-red-600 disabled:opacity-50 active:scale-[0.98] transition-all"
          >
            {loading ? 'Cancelling…' : 'Yes, cancel it'}
          </button>
          <button
            onClick={() => { setView('view'); setError(''); }}
            className="w-full py-4 rounded-2xl text-sm border border-black/10 active:scale-[0.98] transition-all"
          >
            Keep appointment
          </button>
        </div>
      </div>
    );
  }

  // ── Reschedule picker ─────────────────────────────────────────────────────
  if (view === 'reschedule') {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <button
            onClick={() => { setView('view'); setError(''); }}
            className="text-sm opacity-50 hover:opacity-80 transition-opacity mb-3"
          >
            ← Back
          </button>
          <h1 className="text-2xl">Reschedule</h1>
          <p className="text-sm opacity-50 mt-1">
            Currently {fmtDate(apt.date)} at {fmtTime(apt.startTime)}
          </p>
        </div>

        {/* Date + time pickers */}
        <div className="rounded-2xl border border-black/8 divide-y divide-black/8 overflow-hidden">
          {/* Date */}
          <div className="flex justify-between items-center px-4 py-3">
            <span className="text-sm opacity-50">Date</span>
            <div className="relative flex items-center justify-end" style={{ minHeight: 28 }}>
              <span className="text-sm font-medium pointer-events-none select-none">
                {fmtDateDisplay(reschedDate)}
              </span>
              <input
                type="date"
                value={reschedDate}
                min={today}
                onChange={(e) => setReschedDate(e.target.value)}
                style={{
                  position: 'absolute', inset: '-12px -16px',
                  opacity: 0.01, cursor: 'pointer',
                  fontSize: 16,
                }}
              />
            </div>
          </div>

          {/* Time */}
          <div className="flex justify-between items-center px-4 py-3">
            <span className="text-sm opacity-50">Time</span>
            <select
              value={reschedTime}
              onChange={(e) => setReschedTime(e.target.value)}
              className="text-sm font-medium bg-transparent border-none outline-none cursor-pointer appearance-none"
            >
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>{fmtTime(t)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Duration hint */}
        <p className="text-xs opacity-40 text-center -mt-2">
          {fmtTime(reschedTime)} – {fmtTime(addMinutes(reschedTime, apt.durationMinutes))} · {apt.durationMinutes} min
        </p>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          onClick={doReschedule}
          disabled={loading}
          className="w-full py-4 rounded-2xl text-sm font-medium bg-black text-white disabled:opacity-40 active:scale-[0.98] transition-all"
        >
          {loading ? 'Saving…' : `Move to ${fmtDate(reschedDate)} at ${fmtTime(reschedTime)}`}
        </button>
      </div>
    );
  }

  // ── Default view ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl mb-1">Your appointment</h1>
        <p className="text-sm opacity-50">{apt.clientName}</p>
      </div>

      <AppointmentCard apt={apt} />

      {apt.status === 'cancelled' && (
        <p className="text-sm text-center opacity-50">This appointment has been cancelled.</p>
      )}

      {apt.status === 'completed' && (
        <p className="text-sm text-center opacity-50">This appointment has been completed.</p>
      )}

      {isPast && apt.status === 'confirmed' && (
        <p className="text-sm text-center opacity-50">This appointment has already passed.</p>
      )}

      {isActive && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => { setReschedDate(apt.date); setReschedTime(apt.startTime); setView('reschedule'); }}
            className="w-full py-4 rounded-2xl text-sm font-medium border border-black/10 active:scale-[0.98] transition-all"
          >
            Reschedule
          </button>
          <button
            onClick={() => setView('cancel')}
            className="w-full py-4 rounded-2xl text-sm text-red-500 active:scale-[0.98] transition-all"
          >
            Cancel appointment
          </button>
        </div>
      )}

      {isActive && (
        <p className="text-xs opacity-30 text-center">
          Need to make changes? You can reschedule or cancel up to 24 hours before your appointment.
        </p>
      )}
    </div>
  );
}

function AppointmentCard({ apt }: { apt: Appointment }) {
  return (
    <div className="rounded-2xl border border-black/8 divide-y divide-black/8">
      <div className="px-4 py-3">
        <p className="text-sm font-medium">{apt.service}</p>
        <p className="text-xs opacity-40 mt-0.5">with {STAFF_LABEL[apt.staff] ?? apt.staff}</p>
      </div>
      <div className="px-4 py-3 flex flex-col gap-0.5">
        <p className="text-sm font-medium">{fmtDate(apt.date)}</p>
        <p className="text-sm opacity-50">
          {fmtTime(apt.startTime)} – {fmtTime(apt.endTime)} · {apt.durationMinutes} min
        </p>
      </div>
      <div className="px-4 py-3 flex justify-between items-center">
        <span className="text-sm opacity-50">Total</span>
        <span className="text-sm font-medium">${apt.price}</span>
      </div>
    </div>
  );
}
