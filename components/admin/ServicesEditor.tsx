'use client';
import { useState } from 'react';
import type { ServicesData } from '@/lib/services-store';
import type { Service, ServiceGroup } from '@/lib/services';

type EditState = {
  id: string;
  name: string;
  description: string;
  price: string;
  durationMinutes: string;
  isAddon: boolean;
} | null;

function updateServiceInData(d: ServicesData, updated: Service): ServicesData {
  return {
    barberServices:  d.barberServices.map((s) => s.id === updated.id ? updated : s),
    tanServices:     d.tanServices.map((s) => s.id === updated.id ? updated : s),
    tanAddons:       d.tanAddons.map((s) => s.id === updated.id ? updated : s),
    waxGroups:       d.waxGroups.map((g) => ({
      ...g,
      services: g.services.map((s) => s.id === updated.id ? updated : s),
    })),
  };
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
  borderRadius: 8, padding: '10px 12px',
  fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)',
  outline: 'none',
};

export default function ServicesEditor({ initial }: { initial: ServicesData }) {
  const [data, setData] = useState(initial);
  const [editing, setEditing] = useState<EditState>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function openEdit(svc: Service) {
    setEditing({
      id: svc.id,
      name: svc.name,
      description: svc.description ?? '',
      price: String(svc.price),
      durationMinutes: String(svc.durationMinutes),
      isAddon: svc.isAddon ?? false,
    });
    setError('');
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/services/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editing.name.trim(),
          description: editing.description.trim(),
          price: Number(editing.price),
          durationMinutes: Number(editing.durationMinutes),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to save');
      setData((d) => updateServiceInData(d, body as Service));
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ paddingBottom: 48 }}>
      {/* Barbering */}
      <SectionHeader label="Barbering" staff="Eric" />
      <ServiceList services={data.barberServices} onEdit={openEdit} />

      {/* Sunless Tan */}
      <SectionHeader label="Sunless Tan" staff="Livi" />
      <ServiceList services={data.tanServices} onEdit={openEdit} />
      <GroupLabel label="Add-ons" />
      <ServiceList services={data.tanAddons} onEdit={openEdit} />

      {/* Waxing */}
      <SectionHeader label="Waxing" staff="Livi" />
      {data.waxGroups.map((group) => (
        <div key={group.name}>
          <GroupLabel label={group.name} note={group.note} />
          <ServiceList services={group.services} onEdit={openEdit} />
        </div>
      ))}

      {/* Edit sheet */}
      {editing && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'flex-end', zIndex: 100,
          }}
          onClick={() => setEditing(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', background: 'var(--admin-sheet)',
              borderRadius: '16px 16px 0 0',
              padding: '24px 20px 48px',
              maxHeight: '85vh', overflowY: 'auto',
            }}
          >
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500,
              color: 'var(--admin-text)', marginBottom: 20,
            }}>
              Edit service
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Name */}
              <div>
                <Label>Name</Label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing((ed) => ed && ({ ...ed, name: e.target.value }))}
                  style={inputStyle}
                />
              </div>

              {/* Description */}
              <div>
                <Label>Description</Label>
                <textarea
                  value={editing.description}
                  onChange={(e) => setEditing((ed) => ed && ({ ...ed, description: e.target.value }))}
                  placeholder="Short description shown to clients…"
                  rows={3}
                  style={{ ...inputStyle, resize: 'none' }}
                />
              </div>

              {/* Price + Duration side by side */}
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <Label>Price ($)</Label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={editing.price}
                    min={0}
                    step={1}
                    onChange={(e) => setEditing((ed) => ed && ({ ...ed, price: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                {(!editing.isAddon || Number(editing.durationMinutes) > 0) && (
                  <div style={{ flex: 1 }}>
                    <Label>Duration (min)</Label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={editing.durationMinutes}
                      min={0}
                      step={5}
                      onChange={(e) => setEditing((ed) => ed && ({ ...ed, durationMinutes: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div style={{
                marginTop: 14, fontFamily: 'var(--font-body)',
                fontSize: 13, color: 'var(--admin-error)',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
              <button
                onClick={saveEdit}
                disabled={saving}
                style={{
                  width: '100%', padding: 14, borderRadius: 10, border: 'none',
                  background: saving ? 'var(--admin-btn)' : 'var(--admin-btn-primary-bg)',
                  fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
                  color: saving ? 'var(--admin-muted)' : 'var(--admin-btn-primary-fg)',
                  cursor: saving ? 'default' : 'pointer',
                }}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                onClick={() => setEditing(null)}
                style={{
                  width: '100%', padding: 14, borderRadius: 10,
                  border: '1px solid var(--admin-border)', background: 'none',
                  fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text2)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ label, staff }: { label: string; staff: string }) {
  return (
    <div style={{ padding: '28px 20px 10px' }}>
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 2,
      }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)' }}>
        with {staff}
      </div>
    </div>
  );
}

function GroupLabel({ label, note }: { label: string; note?: string }) {
  return (
    <div style={{
      padding: '12px 20px 6px',
      display: 'flex', alignItems: 'baseline', gap: 8,
    }}>
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: 11,
        letterSpacing: '0.08em', color: 'var(--admin-muted)',
      }}>
        {label}
      </span>
      {note && (
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)' }}>
          · {note}
        </span>
      )}
    </div>
  );
}

function ServiceList({ services, onEdit }: { services: Service[]; onEdit: (s: Service) => void }) {
  return (
    <div style={{
      margin: '0 20px',
      background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
      borderRadius: 10, overflow: 'hidden',
    }}>
      {services.map((svc, i) => (
        <button
          key={svc.id}
          onClick={() => onEdit(svc)}
          style={{
            width: '100%', textAlign: 'left',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '13px 16px',
            background: 'none', border: 'none',
            borderBottomWidth: i < services.length - 1 ? 1 : 0,
            borderBottomStyle: 'solid',
            borderBottomColor: 'var(--admin-border-sub)',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {svc.name}
            </div>
            {svc.description && (
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)',
                marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {svc.description}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)' }}>
                ${svc.price}
              </div>
              {svc.durationMinutes > 0 && (
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)' }}>
                  {svc.durationMinutes} min
                </div>
              )}
            </div>
            <span style={{ fontSize: 14, color: 'var(--admin-muted)' }}>›</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-body)', fontSize: 11,
      letterSpacing: '0.06em', color: 'var(--admin-text3)',
      marginBottom: 6, textTransform: 'uppercase',
    }}>
      {children}
    </div>
  );
}
