'use client';
import { useState } from 'react';
import useScrollLock from './useScrollLock';
import type { ServicesData } from '@/lib/services-store';
import type { AddTarget } from '@/lib/services-store';
import type { Service, ServiceGroup } from '@/lib/services';

// ── Types ─────────────────────────────────────────────────────────────────────

type SheetState = {
  /** Existing service id when editing, empty string when adding new. */
  id: string;
  name: string;
  description: string;
  price: string;
  durationMinutes: string;
  isAddon: boolean;
  requiresWaiver: boolean;
  addTarget: AddTarget | null;
  /** Label shown at top of sheet ("Barbering", "Sunless Tan", …) */
  sectionLabel: string;
  confirmDelete: boolean;
} | null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function addToData(d: ServicesData, svc: Service, target: AddTarget): ServicesData {
  if (target.kind === 'barber')   return { ...d, barberServices: [...d.barberServices, svc] };
  if (target.kind === 'tan')      return { ...d, tanServices:    [...d.tanServices, svc] };
  if (target.kind === 'tanAddon') return { ...d, tanAddons:      [...d.tanAddons, svc] };
  if (target.kind === 'lashes')   return { ...d, lashServices:   [...d.lashServices, svc] };
  return {
    ...d,
    waxGroups: d.waxGroups.map((g) =>
      g.name === target.groupName ? { ...g, services: [...g.services, svc] } : g
    ),
  };
}

function updateInData(d: ServicesData, svc: Service): ServicesData {
  const upd = (arr: Service[]) => arr.map((s) => s.id === svc.id ? svc : s);
  return {
    barberServices: upd(d.barberServices),
    tanServices:    upd(d.tanServices),
    tanAddons:      upd(d.tanAddons),
    lashServices:   upd(d.lashServices),
    waxGroups:      d.waxGroups.map((g) => ({ ...g, services: upd(g.services) })),
  };
}

function removeFromData(d: ServicesData, id: string): ServicesData {
  const rm = (arr: Service[]) => arr.filter((s) => s.id !== id);
  return {
    barberServices: rm(d.barberServices),
    tanServices:    rm(d.tanServices),
    tanAddons:      rm(d.tanAddons),
    lashServices:   rm(d.lashServices),
    waxGroups:      d.waxGroups.map((g) => ({ ...g, services: rm(g.services) })),
  };
}

// ── Styles ────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
  borderRadius: 8, padding: '10px 12px',
  fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)',
  outline: 'none',
};

// ── Main component ────────────────────────────────────────────────────────────

export default function ServicesEditor({ initial }: { initial: ServicesData }) {
  const [data, setData]     = useState(initial);
  const [sheet, setSheet]   = useState<SheetState>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  // Freeze the page while the edit sheet is open
  useScrollLock(!!sheet);

  // Open sheet to edit an existing service
  function openEdit(svc: Service) {
    setSheet({
      id:              svc.id,
      name:            svc.name,
      description:     svc.description ?? '',
      price:           String(svc.price),
      durationMinutes: String(svc.durationMinutes),
      isAddon:         svc.isAddon ?? false,
      requiresWaiver:  svc.requiresWaiver,
      addTarget:       null,
      sectionLabel:    '',
      confirmDelete:   false,
    });
    setError('');
  }

  // Open sheet to add a new service to a given section
  function openAdd(target: AddTarget, sectionLabel: string) {
    const isAddon  = target.kind === 'tanAddon';
    const waiverByDefault = target.kind === 'wax' || target.kind === 'lashes';
    setSheet({
      id:              '',
      name:            '',
      description:     '',
      price:           '',
      durationMinutes: isAddon ? '0' : '30',
      isAddon,
      requiresWaiver:  waiverByDefault,
      addTarget:       target,
      sectionLabel,
      confirmDelete:   false,
    });
    setError('');
  }

  async function handleSave() {
    if (!sheet) return;
    setSaving(true);
    setError('');

    const price    = Number(sheet.price);
    const duration = Number(sheet.durationMinutes);
    if (!sheet.name.trim())    { setError('Name is required.'); setSaving(false); return; }
    if (isNaN(price) || price < 0) { setError('Enter a valid price.'); setSaving(false); return; }

    try {
      if (sheet.id) {
        // ── Edit existing ──
        const res = await fetch(`/api/admin/services/${sheet.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:           sheet.name.trim(),
            description:    sheet.description.trim(),
            price,
            durationMinutes: duration,
            requiresWaiver: sheet.requiresWaiver,
          }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? 'Failed to save');
        setData((d) => updateInData(d, body as Service));
      } else {
        // ── Add new ──
        const res = await fetch('/api/admin/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:            sheet.name.trim(),
            description:     sheet.description.trim(),
            price,
            durationMinutes: duration,
            requiresWaiver:  sheet.requiresWaiver,
            addTarget:       sheet.addTarget,
          }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? 'Failed to add');
        setData((d) => addToData(d, body as Service, sheet.addTarget!));
      }
      setSheet(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!sheet?.id) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/services/${sheet.id}`, { method: 'DELETE' });
      if (!res.ok) { const b = await res.json(); throw new Error(b.error ?? 'Failed to delete'); }
      setData((d) => removeFromData(d, sheet.id));
      setSheet(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  const isNew = sheet && !sheet.id;

  return (
    <div style={{ paddingBottom: 48 }}>
      {/* ── Barbering ── */}
      <SectionHeader label="Barbering" staff="Eric" />
      <ServiceList services={data.barberServices} onEdit={openEdit} />
      <AddRow onClick={() => openAdd({ kind: 'barber' }, 'Barbering')} />

      {/* ── Sunless Tan ── */}
      <SectionHeader label="Sunless Tan" staff="Livi" />
      <ServiceList services={data.tanServices} onEdit={openEdit} />
      <AddRow onClick={() => openAdd({ kind: 'tan' }, 'Sunless Tan')} />
      <GroupLabel label="Add-ons" />
      <ServiceList services={data.tanAddons} onEdit={openEdit} />
      <AddRow onClick={() => openAdd({ kind: 'tanAddon' }, 'Tan Add-ons')} />

      {/* ── Waxing ── */}
      <SectionHeader label="Waxing" staff="Livi" />
      {data.waxGroups.map((group) => (
        <div key={group.name}>
          <GroupLabel label={group.name} note={group.note} />
          <ServiceList services={group.services} onEdit={openEdit} />
          <AddRow onClick={() => openAdd({ kind: 'wax', groupName: group.name }, `Waxing — ${group.name}`)} />
        </div>
      ))}

      {/* ── Lashes ── */}
      <SectionHeader label="Lashes" staff="Niamh" />
      <ServiceList services={data.lashServices} onEdit={openEdit} />
      <AddRow onClick={() => openAdd({ kind: 'lashes' }, 'Lashes')} />

      {/* ── Bottom sheet ── */}
      {sheet && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'flex-end', zIndex: 100,
          }}
          onClick={() => { if (!saving) setSheet(null); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="lg-sheet"
            style={{
              width: 'calc(100% - 20px)',
              margin: '0 10px calc(10px + env(safe-area-inset-bottom))',
              borderRadius: 32,
              padding: '24px 20px 34px',
              maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            {/* Title */}
            <div style={{ marginBottom: 4, fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500, color: 'var(--admin-text)' }}>
              {isNew ? 'Add service' : 'Edit service'}
            </div>
            {isNew && sheet.sectionLabel && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)', marginBottom: 20 }}>
                {sheet.sectionLabel}
              </div>
            )}
            {!isNew && <div style={{ marginBottom: 20 }} />}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <Label>Name</Label>
                <input
                  type="text"
                  value={sheet.name}
                  autoFocus={!!isNew}
                  onChange={(e) => setSheet((s) => s && ({ ...s, name: e.target.value, confirmDelete: false }))}
                  style={inputStyle}
                />
              </div>

              <div>
                <Label>Description</Label>
                <textarea
                  value={sheet.description}
                  onChange={(e) => setSheet((s) => s && ({ ...s, description: e.target.value }))}
                  placeholder="Short description shown to clients…"
                  rows={3}
                  style={{ ...inputStyle, resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <Label>Price ($)</Label>
                  <input
                    type="number" inputMode="decimal"
                    value={sheet.price} min={0} step={1}
                    onChange={(e) => setSheet((s) => s && ({ ...s, price: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                {(!sheet.isAddon || Number(sheet.durationMinutes) > 0 || isNew) && (
                  <div style={{ flex: 1 }}>
                    <Label>Duration (min)</Label>
                    <input
                      type="number" inputMode="numeric"
                      value={sheet.durationMinutes} min={0} step={5}
                      onChange={(e) => setSheet((s) => s && ({ ...s, durationMinutes: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>

              {/* Requires waiver — shown for all services */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={sheet.requiresWaiver}
                  onChange={(e) => setSheet((s) => s && ({ ...s, requiresWaiver: e.target.checked }))}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)' }}>
                  Requires intake form
                </span>
              </label>
            </div>

            {error && (
              <div style={{ marginTop: 14, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-error)' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  width: '100%', padding: 14, borderRadius: 10, border: 'none',
                  background: saving ? 'var(--admin-btn)' : 'var(--admin-btn-primary-bg)',
                  fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
                  color: saving ? 'var(--admin-muted)' : 'var(--admin-btn-primary-fg)',
                  cursor: saving ? 'default' : 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {saving ? 'Saving…' : isNew ? 'Add service' : 'Save changes'}
              </button>

              <button
                onClick={() => setSheet(null)}
                disabled={saving}
                style={{
                  width: '100%', padding: 14, borderRadius: 10,
                  border: '1px solid var(--admin-border)', background: 'none',
                  fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text2)',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Cancel
              </button>

              {/* Delete — only for existing services */}
              {!isNew && (
                sheet.confirmDelete ? (
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    style={{
                      width: '100%', padding: 14, borderRadius: 10, border: 'none',
                      background: 'var(--admin-danger, #c0392b)',
                      fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
                      color: '#fff', cursor: saving ? 'default' : 'pointer',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {saving ? 'Deleting…' : 'Confirm delete'}
                  </button>
                ) : (
                  <button
                    onClick={() => setSheet((s) => s && ({ ...s, confirmDelete: true }))}
                    style={{
                      width: '100%', padding: 12, background: 'none', border: 'none',
                      fontFamily: 'var(--font-body)', fontSize: 13,
                      color: 'var(--admin-danger, #c0392b)',
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    Delete service
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ label, staff }: { label: string; staff: string }) {
  return (
    <div style={{ padding: '28px 20px 10px' }}>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 2 }}>
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
    <div style={{ padding: '12px 20px 6px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--admin-muted)' }}>
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
  if (services.length === 0) return null;
  return (
    <div style={{ margin: '0 20px', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: 10, overflow: 'hidden' }}>
      {services.map((svc, i) => (
        <button
          key={svc.id}
          onClick={() => onEdit(svc)}
          style={{
            width: '100%', textAlign: 'left',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '13px 16px', background: 'none', border: 'none',
            borderBottomWidth: i < services.length - 1 ? 1 : 0,
            borderBottomStyle: 'solid', borderBottomColor: 'var(--admin-border-sub)',
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {svc.name}
            </div>
            {svc.description && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

function AddRow({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        margin: '6px 20px 0',
        padding: '10px 4px',
        background: 'none', border: 'none',
        fontFamily: 'var(--font-body)', fontSize: 13,
        color: 'var(--admin-muted)',
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1, marginTop: -1 }}>+</span>
      Add service
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.06em', color: 'var(--admin-text3)', marginBottom: 6, textTransform: 'uppercase' }}>
      {children}
    </div>
  );
}
