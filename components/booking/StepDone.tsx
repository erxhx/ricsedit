'use client';

import { BookingState, CATEGORY_META, formatDate, formatTime } from '@/lib/services';

interface Props {
  state: BookingState;
  onReset: () => void;
}

export default function StepDone({ state, onReset }: Props) {
  const { category, date, timeSlot, client } = state;
  if (!category || !date || !timeSlot) return null;

  const accent = CATEGORY_META[category].accent;

  return (
    <div className="flex flex-col items-center text-center gap-6 py-8">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
        style={{ backgroundColor: `color-mix(in oklch, ${accent} 15%, transparent)` }}
      >
        ✓
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium">You&rsquo;re booked.</h1>
        <p className="text-sm opacity-60">
          {formatDate(date)} at {formatTime(timeSlot)}
        </p>
        <p className="text-sm opacity-60">
          A confirmation has been sent to {client.email}.
        </p>
      </div>

      <p className="text-xs opacity-40 max-w-xs">
        Need to change something? Check your confirmation email for a link to reschedule or cancel.
      </p>

      <button
        onClick={onReset}
        className="text-sm underline opacity-40 hover:opacity-70 transition-opacity"
      >
        Book another appointment
      </button>
    </div>
  );
}
