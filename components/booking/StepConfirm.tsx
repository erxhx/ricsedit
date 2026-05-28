'use client';

import { useState } from 'react';
import {
  BookingState,
  CATEGORY_META,
  formatDate,
  formatTime,
  getTotalDuration,
  getTotalPrice,
} from '@/lib/services';

interface Props {
  state: BookingState;
  onBack: () => void;
  onConfirm: () => void;
}

export default function StepConfirm({ state, onBack, onConfirm }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const { category, selectedServices, date, timeSlot, client } = state;
  if (!category || !date || !timeSlot) return null;

  const meta = CATEGORY_META[category];
  const accent = meta.accent;
  const total = getTotalPrice(selectedServices);
  const duration = getTotalDuration(selectedServices);

  async function handleConfirm() {
    setSubmitting(true);
    // TODO: POST /api/bookings with state
    await new Promise((r) => setTimeout(r, 800)); // stub
    onConfirm();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <button onClick={onBack} className="text-sm opacity-50 hover:opacity-80 transition-opacity mb-3">
          ← Back
        </button>
        <h1 className="text-2xl font-medium">Confirm booking</h1>
      </div>

      {/* Services */}
      <div className="rounded-2xl border border-black/8 divide-y divide-black/8">
        <div className="px-4 py-3 flex items-center gap-2">
          <span className="text-xs tracking-widest uppercase opacity-40">{meta.num}</span>
          <span className="text-sm font-medium">{meta.label}</span>
        </div>
        {selectedServices.map((s) => (
          <div key={s.id} className="px-4 py-3 flex justify-between text-sm">
            <span>{s.name}</span>
            <span className="opacity-60">${s.price}</span>
          </div>
        ))}
        <div className="px-4 py-3 flex justify-between text-sm font-medium">
          <span>Total · {duration} min</span>
          <span>${total}</span>
        </div>
      </div>

      {/* Date + time */}
      <div className="rounded-2xl border border-black/8 px-4 py-4 flex flex-col gap-1">
        <p className="text-sm font-medium">{formatDate(date)}</p>
        <p className="text-sm opacity-60">{formatTime(timeSlot)}</p>
      </div>

      {/* Client */}
      <div className="rounded-2xl border border-black/8 px-4 py-4 flex flex-col gap-1">
        <p className="text-sm font-medium">{client.name}</p>
        <p className="text-sm opacity-60">{client.email}</p>
        <p className="text-sm opacity-60">{client.phone}</p>
      </div>

      <p className="text-xs opacity-40 text-center">
        A confirmation will be sent to {client.email} and {client.phone}.
      </p>

      <button
        onClick={handleConfirm}
        disabled={submitting}
        className="w-full py-4 rounded-2xl text-sm font-medium tracking-wide transition-all active:scale-[0.98] disabled:opacity-60"
        style={{ backgroundColor: accent, color: '#f6f4ef' }}
      >
        {submitting ? 'Booking…' : 'Confirm booking'}
      </button>
    </div>
  );
}
