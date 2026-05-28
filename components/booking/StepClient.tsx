'use client';

import { useState } from 'react';
import { CATEGORY_META, ClientInfo, ServiceCategory } from '@/lib/services';

interface Props {
  category: ServiceCategory;
  client: ClientInfo;
  onChange: (client: ClientInfo) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepClient({ category, client, onChange, onNext, onBack }: Props) {
  const accent = CATEGORY_META[category].accent;
  const [errors, setErrors] = useState<Partial<ClientInfo>>({});

  function update(field: keyof ClientInfo, value: string) {
    onChange({ ...client, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  }

  function validate(): boolean {
    const e: Partial<ClientInfo> = {};
    if (!client.name.trim()) e.name = 'Required';
    if (!client.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email))
      e.email = 'Valid email required';
    if (!client.phone.trim()) e.phone = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (validate()) onNext();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <button onClick={onBack} className="text-sm opacity-50 hover:opacity-80 transition-opacity mb-3">
          ← Back
        </button>
        <h1 className="text-2xl font-medium">Your details</h1>
      </div>

      <div className="flex flex-col gap-4">
        <Field
          label="Name"
          type="text"
          value={client.name}
          placeholder="Jane Smith"
          error={errors.name}
          accent={accent}
          onChange={(v) => update('name', v)}
        />
        <Field
          label="Email"
          type="email"
          value={client.email}
          placeholder="jane@email.com"
          error={errors.email}
          accent={accent}
          onChange={(v) => update('email', v)}
        />
        <Field
          label="Phone"
          type="tel"
          value={client.phone}
          placeholder="250 555 0100"
          error={errors.phone}
          accent={accent}
          onChange={(v) => update('phone', v)}
        />
      </div>

      <p className="text-xs opacity-40">
        Your contact details are only used to confirm and manage your booking.
      </p>

      <button
        onClick={handleNext}
        className="w-full py-4 rounded-2xl text-sm font-medium tracking-wide transition-all active:scale-[0.98]"
        style={{ backgroundColor: accent, color: '#f6f4ef' }}
      >
        Continue
      </button>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  placeholder,
  error,
  accent,
  onChange,
}: {
  label: string;
  type: string;
  value: string;
  placeholder: string;
  error?: string;
  accent: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm opacity-60">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={type === 'tel' ? 'tel' : type === 'email' ? 'email' : 'name'}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors"
        style={
          error
            ? { borderColor: 'oklch(0.55 0.18 25)' }
            : { borderColor: 'rgba(0,0,0,0.12)' }
        }
        onFocus={(e) => (e.currentTarget.style.borderColor = accent)}
        onBlur={(e) =>
          (e.currentTarget.style.borderColor = error
            ? 'oklch(0.55 0.18 25)'
            : 'rgba(0,0,0,0.12)')
        }
      />
      {error && <p className="text-xs" style={{ color: 'oklch(0.55 0.18 25)' }}>{error}</p>}
    </div>
  );
}
