'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ClientRecord } from '@/lib/admin-mock';
import Link from 'next/link';
import type { StaffId } from '@/lib/admin-mock';
import type { Service, ServiceCategory } from '@/lib/services';
import { STAFF, getStaff, staffColor as rosterColor } from '@/lib/staff';
import { getServicesStore } from '@/lib/services-store';
import type { ServicesData } from '@/lib/services-store';

/** A labelled group of services for the picker (label null = render flat). */
type ServiceGroup = { label: string | null; services: Service[] };

function categoryGroups(cat: ServiceCategory, data: ServicesData): ServiceGroup[] {
  switch (cat) {
    case 'barber': return [{ label: null, services: data.barberServices }];
    case 'tan':    return [{ label: 'Sunless Tan', services: data.tanServices }];
    case 'wax':    return data.waxGroups.map((g) => ({ label: g.name, services: g.services }));
    case 'lashes': return [{ label: null, services: data.lashServices }];
    default:       return [];
  }
}

/** Grouped service options for a staff member, in their category order. */
function staffServiceGroups(staff: StaffId, data: ServicesData): ServiceGroup[] {
  const member = getStaff(staff);
  if (!member) return [];
  return member.categories.flatMap((c) => categoryGroups(c, data));
}

function staffServices(staff: StaffId, data: ServicesData): Service[] {
  return staffServiceGroups(staff, data).flatMap((g) => g.services);
}

function findService(staff: StaffId, name: string, data: ServicesData): Service | undefined {
  return staffServices(staff, data).find((s) => s.name === name);
}

const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 22; h++) {
  for (let m = 0; m < 60; m += 15) {
    if (h === 22 && m > 0) break;
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

// Using CSS vars — works as inline style values
const inputStyle: React.CSSProperties = {
  background: 'none', border: 'none', outline: 'none',
  fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)',
  textAlign: 'right', width: '100%', padding: 0,
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  WebkitAppearance: 'none',
  appearance: 'none',
};

const sectionBox: React.CSSProperties = {
  background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
  borderRadius: 10, overflow: 'hidden',
  padding: '4px 16px', marginBottom: 24,
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
  servicesData: ServicesData;
}) {
  const router = useRouter();

  const firstService = staffServices(defaultStaff, servicesData)[0];

  const [staff, setStaff] = useState<StaffId>(defaultStaff);
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultTime ?? '10:00');
  const [serviceKey, setServiceKey] = useState(firstService?.name ?? '__custom__');
  const [customService, setCustomService] = useState('');
  const [duration, setDuration] = useState(firstService?.durationMinutes ?? 30);
  const [price, setPrice] = useState(firstService?.price ?? 0);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [suggestions, setSuggestions] = useState<ClientRecord[]>([]);
  const [selectedClientLastService, setSelectedClientLastService] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const first = staffServices(staff, servicesData)[0];
    if (!first) { setServiceKey('__custom__'); setCustomService(''); return; }
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

  function triggerSearch(value: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim().length < 2) { setSuggestions([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/clients/search?q=${encodeURIComponent(value)}`);
        if (res.ok) setSuggestions(await res.json());
      } catch { /* ignore */ }
    }, 200);
  }

  function handleClientNameChange(value: string) {
    setClientName(value);
    setSelectedClientLastService(null);
    triggerSearch(value);
  }

  function handleClientPhoneChange(value: string) {
    setClientPhone(value);
    // Only search by phone if name is blank — avoids confusing double-search
    if (!clientName.trim()) triggerSearch(value);
  }

  function selectClient(c: ClientRecord) {
    setClientName(c.name);
    setClientEmail(c.email);
    setClientPhone(c.phone);
    setSuggestions([]);
    setSelectedClientLastService(c.lastService ?? null);
  }

  function fmtLastVisit(dateStr: string): string {
    const [y, mo, d] = dateStr.split('-').map(Number);
    const thisYear = new Date().getFullYear();
    return new Date(y, mo - 1, d).toLocaleDateString('en-CA', {
      month: 'short', day: 'numeric', ...(y !== thisYear ? { year: 'numeric' } : {}),
    });
  }

  const serviceName = serviceKey === '__custom__' ? customService : serviceKey;
  const staffColor = rosterColor(staff);

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
        borderBottom: '1px solid var(--admin-border)',
        position: 'sticky', top: 52, background: 'var(--admin-bg)', zIndex: 8,
      }}>
        <button onClick={() => router.back()} style={{ color: 'var(--admin-text2)', background: 'none', border: 'none', fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: '0 4px', WebkitTapHighlightColor: 'transparent' }}>
          ‹
        </button>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text3)' }}>
          New booking
        </span>
      </div>

      <div style={{ padding: '24px 20px 0' }}>
        {/* Staff toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {STAFF.map((m) => {
            const c = m.color;
            const active = staff === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setStaff(m.id)}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 10,
                  border: active ? `1.5px solid ${c}` : '1px solid var(--admin-border)',
                  background: active ? `${c}18` : 'none',
                  fontFamily: 'var(--font-body)', fontSize: 14,
                  fontWeight: active ? 500 : 400,
                  color: active ? c : 'var(--admin-muted)',
                  cursor: 'pointer',
                }}
              >
                {m.name}
              </button>
            );
          })}
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
              style={{ ...inputStyle, color: clientName ? 'var(--admin-text)' : 'var(--admin-muted)' }}
            />
          </FormRow>

          {/* Autocomplete suggestions */}
          {suggestions.length > 0 && (
            <div style={{ margin: '0 -16px', borderBottom: '1px solid var(--admin-border-sub)' }}>
              {suggestions.map((c) => (
                <button
                  key={c.name}
                  onPointerDown={(e) => { e.preventDefault(); selectClient(c); }}
                  style={{
                    width: '100%', textAlign: 'left', background: 'none',
                    border: 'none', borderBottom: '1px solid var(--admin-border-sub)',
                    padding: '10px 16px', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.phone || c.email || '—'}
                    </span>
                  </div>
                  {(c.visitCount !== undefined && c.visitCount > 0) && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-text3)' }}>
                        {c.visitCount} visit{c.visitCount !== 1 ? 's' : ''}
                      </div>
                      {c.lastVisit && (
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)' }}>
                          {fmtLastVisit(c.lastVisit)}
                        </div>
                      )}
                    </div>
                  )}
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
              style={{ ...inputStyle, color: clientEmail ? 'var(--admin-text)' : 'var(--admin-muted)' }}
            />
          </FormRow>
          <FormRow label="Phone" last>
            <input
              type="tel"
              inputMode="tel"
              value={clientPhone}
              onChange={(e) => handleClientPhoneChange(e.target.value)}
              onBlur={() => setTimeout(() => setSuggestions([]), 150)}
              placeholder="Optional"
              style={{ ...inputStyle, color: clientPhone ? 'var(--admin-text)' : 'var(--admin-muted)' }}
            />
          </FormRow>

          {/* Rebook last visit shortcut */}
          {selectedClientLastService && (() => {
            const svc = findService(staff, selectedClientLastService, servicesData);
            return svc ? (
              <div style={{
                marginTop: 4, padding: '10px 12px',
                background: 'var(--admin-nav-active)',
                border: '1px solid var(--admin-btn-border)',
                borderRadius: 8, cursor: 'pointer',
              }}
              onClick={() => {
                handleServiceChange(svc.name);
                setServiceKey(svc.name);
                setDuration(svc.durationMinutes);
                setPrice(svc.price);
              }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>
                  Rebook last visit
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)' }}>
                  {svc.name} · ${svc.price} · {svc.durationMinutes} min →
                </div>
              </div>
            ) : null;
          })()}
        </div>

        {/* When */}
        <SectionLabel>When</SectionLabel>
        <div style={sectionBox}>
          <FormRow label="Date">
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flex: 1, minHeight: 24 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)', pointerEvents: 'none', userSelect: 'none' }}>
                {fmtDateDisplay(date)}
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  position: 'absolute', inset: '-11px -16px',
                  opacity: 0.01, cursor: 'pointer',
                  fontSize: 16,
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
                <option key={t} value={t} style={{ background: 'var(--admin-card)', color: 'var(--admin-text)' }}>
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
              {staffServiceGroups(staff, servicesData).map((group) =>
                group.label ? (
                  <optgroup key={group.label} label={group.label} style={{ background: 'var(--admin-card)' }}>
                    {group.services.map((s) => (
                      <option key={s.id} value={s.name} style={{ background: 'var(--admin-card)', color: 'var(--admin-text)' }}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  group.services.map((s) => (
                    <option key={s.id} value={s.name} style={{ background: 'var(--admin-card)', color: 'var(--admin-text)' }}>
                      {s.name}
                    </option>
                  ))
                )
              )}
              <option value="__custom__" style={{ background: 'var(--admin-card)', color: 'var(--admin-muted)' }}>
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
                style={{ ...inputStyle, color: customService ? 'var(--admin-text)' : 'var(--admin-muted)' }}
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
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)', flexShrink: 0 }}>
                min
              </span>
            </div>
          </FormRow>
          <FormRow label="Price" last>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-muted)', flexShrink: 0 }}>$</span>
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
              color: notes ? 'var(--admin-text)' : 'var(--admin-muted)',
              resize: 'none', lineHeight: 1.5,
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 16,
            fontFamily: 'var(--font-body)', fontSize: 13,
            color: 'var(--admin-error)', textAlign: 'center',
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
            background: submitting ? 'var(--admin-btn)' : staffColor,
            fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
            color: submitting ? 'var(--admin-muted)' : '#141210',
            cursor: submitting ? 'default' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {submitting ? 'Booking…' : 'Book appointment'}
        </button>

        {/* End time preview */}
        <div style={{
          marginTop: 10, textAlign: 'center',
          fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)',
        }}>
          {fmtTime(startTime)} – {fmtTime(addMinutes(startTime, Math.max(duration, 5)))}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 8,
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
      borderBottom: last ? 'none' : '1px solid var(--admin-border-sub)',
    }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text3)', flexShrink: 0, marginRight: 16 }}>
        {label}
      </span>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
