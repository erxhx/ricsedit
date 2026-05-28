'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ClientRecord } from '@/lib/admin-mock';
import Link from 'next/link';
import type { StaffId } from '@/lib/admin-mock';
import { BARBER_SERVICES, TAN_SERVICES, WAX_GROUPS } from '@/lib/services';
import type { Service } from '@/lib/services';
import { SERVICE_COLORS } from '@/lib/appointment-colors';
import type { ServicesData } from '@/lib/services-store';

function staffServices(staff: StaffId, data?: ServicesData): Service[] {
  if (staff === 'eric') return data?.barberServices ?? BARBER_SERVICES;
  const tan = data?.tanServices ?? TAN_SERVICES;
  const wax = data?.waxGroups ?? WAX_GROUPS;
  return [...tan, ...wax.flatMap((g) => g.services)];
}

function findService(staff: StaffId, name: string, data?: ServicesData): Service | undefined {
  return staffServices(staff, data).find((s) => s.name === name);
}

const TIME_SLOTS: string[] = [];
for (let h = 9; h <= 19; h++) {
  for (let m = 0; m < 60; m += 15) {
    if (h === 19 && m > 0) break;
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

function fmtDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr}:${String(m).padStart(2, '0')} ${period}`;
}

function addMinutes(t: string, mins: number): string {
  const [h, m] = t.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const inputStyle: React.CSSProperties = {
  background: 'none', border: 'none', outline: 'none',
  fontFamily: 'var(--font-body)', fontSize: 14, color: '#ece9e2',
  textAlign: 'right', width: '100%', padding: 0,
  colorScheme: 'dark',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  WebkitAppearance: 'none',
  appearance: 'none',
};

export default function NewBookingForm({
  defaultDate,
  defaultStaff = 'eric',
  defaultTime,
  servicesData,
}: {
  defaultDate: string;
  defaultStaff?: StaffId;
  defaultTime?: string;
  servicesData?: ServicesData;
}) {
  const router = useRouter();

  const [staff, setStaff] = useState<StaffId>(defaultStaff);
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultTime ?? '10:00');
  const [serviceKey, setServiceKey] = useState(BARBER_SERVICES[0].name);
  const [customService, setCustomService] = useState('');
  const [duration, setDuration] = useState(BARBER_SERVICES[0].durationMinutes);
  const [price, setPrice] = useState(BARBER_SERVICES[0].price);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [suggestions, setSuggestions] = useState<ClientRecord[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const first = staffServices(staff, servicesData)[0];
    setServiceKey(first.name);
    setCustomService('');
    setDuration(first.durationMinutes);
    setPrice(first.price);
  }, [staff, servicesData]);

  function handleServiceChange(name: string) {
    setServiceKey(name);
    if (name === '__custom__') { setCustomService(''); return; }
    const svc = findService(staff, name, servicesData);
    if (svc) { setDuration(svc.durationMinutes); setPrice(svc.price); }
  }

  function handleClientNameChange(value: string) {
    setClientName(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim().length < 2) { setSuggestions([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/clients/search?q=${encodeURIComponent(value)}`);
        if (res.ok) setSuggestions(await res.json());
      } catch { /* ignore */ }
    }, 200);
  }

  function selectClient(c: ClientRecord) {
    setClientName(c.name);
    setClientEmail(c.email);
    setClientPhone(c.phone);
    setSuggestions([]);
  }

  const serviceName = serviceKey === '__custom__' ? customService : serviceKey;
  const staffColor = staff === 'eric' ? SERVICE_COLORS.ericBarber : SERVICE_COLORS.liviWax;

  async function handleSubmit() {
    if (!clientName.trim()) { setError('Client name is required.'); return; }
    if (!date) { setError('Date is required.'); return; }
    if (!serviceName.trim()) { setError('Service name is required.'); return; }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date, startTime,
          endTime: addMinutes(startTime, Math.max(duration, 5)),
          staff,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim(),
          clientPhone: clientPhone.trim(),
          service: serviceName.trim(),
          durationMinutes: Math.max(duration, 5),
          price,
          status: 'confirmed',
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create booking');
      router.push(`/admin/appointments/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* Sub-header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 20px', height: 52,
        borderBottom: '1px solid #252320',
        position: 'sticky', top: 52, background: '#0d0c0a', zIndex: 8,
      }}>
        <Link href="/admin" style={{ color: '#6b6760', textDecoration: 'none', fontSize: 20, lineHeight: 1 }}>
          ‹
        </Link>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#6b6760' }}>
          New booking
        </span>
      </div>

      <div style={{ padding: '24px 20px 0' }}>
        {/* Staff toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {(['eric', 'livi'] as const).map((s) => {
            const c = s === 'eric' ? SERVICE_COLORS.ericBarber : SERVICE_COLORS.liviWax;
            const active = staff === s;
            return (
              <button
                key={s}
                onClick={() => setStaff(s)}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 10,
                  border: active ? `1.5px solid ${c}` : '1px solid #252320',
                  background: active ? `${c}18` : 'none',
                  fontFamily: 'var(--font-body)', fontSize: 14,
                  fontWeight: active ? 500 : 400,
                  color: active ? c : '#4a4844',
                  cursor: 'pointer',
                }}
              >
                {s === 'eric' ? 'Eric' : 'Livi'}
              </button>
            );
          })}
        </div>

        {/* When */}
        <SectionLabel>When</SectionLabel>
        <div style={sectionBox}>
          <FormRow label="Date">
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flex: 1, minHeight: 24 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#ece9e2', pointerEvents: 'none', userSelect: 'none' }}>
                {fmtDateDisplay(date)}
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  position: 'absolute', inset: '-11px -16px', // extend to fill the full FormRow tap area
                  opacity: 0.01, cursor: 'pointer',
                  fontSize: 16, // prevent iOS auto-zoom on focus
                }}
              />
            </div>
          </FormRow>
          <FormRow label="Start" last>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={selectStyle}
            >
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t} style={{ background: '#1c1b18', color: '#ece9e2' }}>
                  {fmtTime(t)}
                </option>
              ))}
            </select>
          </FormRow>
        </div>

        {/* Service */}
        <SectionLabel>Service</SectionLabel>
        <div style={sectionBox}>
          <FormRow label="Service">
            <select
              value={serviceKey}
              onChange={(e) => handleServiceChange(e.target.value)}
              style={selectStyle}
            >
              {staff === 'eric' ? (
                (servicesData?.barberServices ?? BARBER_SERVICES).map((s) => (
                  <option key={s.id} value={s.name} style={{ background: '#1c1b18', color: '#ece9e2' }}>
                    {s.name}
                  </option>
                ))
              ) : (
                <>
                  <optgroup label="Sunless Tan" style={{ background: '#1c1b18' }}>
                    {(servicesData?.tanServices ?? TAN_SERVICES).map((s) => (
                      <option key={s.id} value={s.name} style={{ background: '#1c1b18', color: '#ece9e2' }}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                  {(servicesData?.waxGroups ?? WAX_GROUPS).map((g) => (
                    <optgroup key={g.name} label={g.name} style={{ background: '#1c1b18' }}>
                      {g.services.map((s) => (
                        <option key={s.id} value={s.name} style={{ background: '#1c1b18', color: '#ece9e2' }}>
                          {s.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </>
              )}
              <option value="__custom__" style={{ background: '#1c1b18', color: '#6b6760' }}>
                Custom…
              </option>
            </select>
          </FormRow>
          {serviceKey === '__custom__' && (
            <FormRow label="Name">
              <input
                type="text"
                value={customService}
                onChange={(e) => setCustomService(e.target.value)}
                placeholder="Service name"
                style={{ ...inputStyle, color: customService ? '#ece9e2' : '#3a3835' }}
              />
            </FormRow>
          )}
          <FormRow label="Duration">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
              <input
                type="number"
                value={duration}
                min={5}
                max={480}
                step={5}
                onChange={(e) => setDuration(Number(e.target.value))}
                style={{ ...inputStyle, width: 48 }}
              />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#6b6760', flexShrink: 0 }}>
                min
              </span>
            </div>
          </FormRow>
          <FormRow label="Price" last>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#6b6760', flexShrink: 0 }}>$</span>
              <input
                type="number"
                value={price}
                min={0}
                step={1}
                onChange={(e) => setPrice(Number(e.target.value))}
                style={{ ...inputStyle, width: 52 }}
              />
            </div>
          </FormRow>
        </div>

        {/* Client */}
        <SectionLabel>Client</SectionLabel>
        <div style={sectionBox}>
          <FormRow label="Name">
            <input
              type="text"
              value={clientName}
              onChange={(e) => handleClientNameChange(e.target.value)}
              onBlur={() => setTimeout(() => setSuggestions([]), 150)}
              placeholder="Full name"
              autoCapitalize="words"
              style={{ ...inputStyle, color: clientName ? '#ece9e2' : '#3a3835' }}
            />
          </FormRow>

          {/* Autocomplete suggestions */}
          {suggestions.length > 0 && (
            <div style={{ margin: '0 -16px', borderBottom: '1px solid #1e1d1a' }}>
              {suggestions.map((c) => (
                <button
                  key={c.name}
                  onPointerDown={(e) => { e.preventDefault(); selectClient(c); }}
                  style={{
                    width: '100%', textAlign: 'left', background: 'none',
                    border: 'none', borderBottom: '1px solid #1a1917',
                    padding: '10px 16px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', gap: 2,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#ece9e2' }}>
                    {c.name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#4a4844' }}>
                    {c.email}{c.phone ? ` · ${c.phone}` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}

          <FormRow label="Email">
            <input
              type="email"
              inputMode="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="Optional"
              autoCapitalize="none"
              style={{ ...inputStyle, color: clientEmail ? '#ece9e2' : '#3a3835' }}
            />
          </FormRow>
          <FormRow label="Phone" last>
            <input
              type="tel"
              inputMode="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="Optional"
              style={{ ...inputStyle, color: clientPhone ? '#ece9e2' : '#3a3835' }}
            />
          </FormRow>
        </div>

        {/* Notes */}
        <SectionLabel>Notes</SectionLabel>
        <div style={{ ...sectionBox, padding: '12px 16px' }}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional note…"
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'none', border: 'none', outline: 'none',
              fontFamily: 'var(--font-body)', fontSize: 14,
              color: notes ? '#ece9e2' : '#3a3835',
              resize: 'none', lineHeight: 1.5,
              colorScheme: 'dark',
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 16,
            fontFamily: 'var(--font-body)', fontSize: 13,
            color: '#c47a7a', textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%', marginTop: 24, padding: '14px',
            borderRadius: 10, border: 'none',
            background: submitting ? '#252320' : staffColor,
            fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
            color: submitting ? '#4a4844' : '#0d0c0a',
            cursor: submitting ? 'default' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {submitting ? 'Booking…' : 'Book appointment'}
        </button>

        {/* End time preview */}
        <div style={{
          marginTop: 10, textAlign: 'center',
          fontFamily: 'var(--font-body)', fontSize: 12, color: '#4a4844',
        }}>
          {fmtTime(startTime)} – {fmtTime(addMinutes(startTime, Math.max(duration, 5)))}
        </div>
      </div>
    </div>
  );
}

const sectionBox: React.CSSProperties = {
  background: '#161513', border: '1px solid #252320',
  borderRadius: 10, overflow: 'hidden',
  padding: '4px 16px', marginBottom: 24,
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: '#4a4844', marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function FormRow({ label, children, last = false }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '11px 0',
      borderBottom: last ? 'none' : '1px solid #1e1d1a',
    }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#6b6760', flexShrink: 0, marginRight: 16 }}>
        {label}
      </span>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
