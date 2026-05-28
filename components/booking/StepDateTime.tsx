'use client';

import { useState } from 'react';
import {
  CATEGORY_META,
  ServiceCategory,
  STUDIO_HOURS,
  formatTime,
  generateTimeSlots,
  getTotalDuration,
  Service,
} from '@/lib/services';

interface Props {
  category: ServiceCategory;
  selectedServices: Service[];
  date: Date | null;
  timeSlot: string | null;
  onDateChange: (date: Date) => void;
  onTimeChange: (slot: string) => void;
  onNext: () => void;
  onBack: () => void;
  weekHours?: Record<number, [number, number] | null>;
  barberThuClose?: number;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function StepDateTime({
  category,
  selectedServices,
  date,
  timeSlot,
  onDateChange,
  onTimeChange,
  onNext,
  onBack,
  weekHours,
  barberThuClose,
}: Props) {
  const accent = CATEGORY_META[category].accent;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const effectiveHours = weekHours ?? STUDIO_HOURS;

  const totalDuration = getTotalDuration(selectedServices);
  const timeSlots = date
    ? generateTimeSlots(date, category, totalDuration, effectiveHours, barberThuClose)
    : [];

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function buildCalendarDays(): (Date | null)[] {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (Date | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(viewYear, viewMonth, d));
    }
    return cells;
  }

  function isAvailable(d: Date): boolean {
    if (d < today) return false;
    return effectiveHours[d.getDay()] !== null;
  }

  function isSelected(d: Date): boolean {
    return !!date && d.toDateString() === date.toDateString();
  }

  const cells = buildCalendarDays();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <button onClick={onBack} className="text-sm opacity-50 hover:opacity-80 transition-opacity mb-3">
          ← Back
        </button>
        <h1 className="text-2xl font-medium">Select a date</h1>
      </div>

      {/* Calendar */}
      <div className="rounded-2xl border border-black/8 p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1 opacity-40 hover:opacity-80 transition-opacity text-lg">
            ←
          </button>
          <p className="text-sm font-medium">
            {MONTHS[viewMonth]} {viewYear}
          </p>
          <button onClick={nextMonth} className="p-1 opacity-40 hover:opacity-80 transition-opacity text-lg">
            →
          </button>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs opacity-30 py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const available = isAvailable(day);
            const selected = isSelected(day);
            return (
              <button
                key={i}
                disabled={!available}
                onClick={() => { onDateChange(day); }}
                className="aspect-square flex items-center justify-center text-sm rounded-full transition-all active:scale-95"
                style={
                  selected
                    ? { backgroundColor: accent, color: '#f6f4ef' }
                    : available
                    ? { opacity: 1 }
                    : { opacity: 0.2, cursor: 'default' }
                }
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      {date && (
        <div>
          <p className="text-sm opacity-50 mb-3">
            {date.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          {timeSlots.length === 0 ? (
            <p className="text-sm opacity-40 text-center py-6">No availability — try another day.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => onTimeChange(slot)}
                  className="py-3 rounded-xl text-sm font-medium border transition-all active:scale-95"
                  style={
                    timeSlot === slot
                      ? { backgroundColor: accent, color: '#f6f4ef', borderColor: accent }
                      : { borderColor: 'rgba(0,0,0,0.1)' }
                  }
                >
                  {formatTime(slot)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {date && timeSlot && (
        <button
          onClick={onNext}
          className="w-full py-4 rounded-2xl text-sm font-medium tracking-wide transition-all active:scale-[0.98]"
          style={{ backgroundColor: accent, color: '#f6f4ef' }}
        >
          Continue
        </button>
      )}
    </div>
  );
}
