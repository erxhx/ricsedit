'use client';
import { useState, useEffect, useCallback } from 'react';
import type { FormField, FieldType, IntakeFormConfig, FormCategory } from '@/lib/intake-form-store';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: { value: FormCategory; label: string }[] = [
  { value: 'tan',    label: 'Sunless' },
  { value: 'wax',    label: 'Waxing' },
  { value: 'lashes', label: 'Lashes' },
  { value: 'barber', label: 'Barbering' },
];

const FIELD_TYPES: { value: FieldType; label: string; color: string }[] = [
  { value: 'text',           label: 'Short text',  color: '#6a6560' },
  { value: 'email',          label: 'Email',       color: '#6a6560' },
  { value: 'phone',          label: 'Phone',       color: '#6a6560' },
  { value: 'date',           label: 'Date',        color: '#6a6560' },
  { value: 'textarea',       label: 'Long text',   color: '#4a7a9b' },
  { value: 'yes_no',         label: 'Yes / No',    color: '#4a9b6f' },
  { value: 'checkbox_group', label: 'Checkboxes',  color: '#7a5a9b' },
  { value: 'signature',      label: 'Signature',   color: '#b5824a' },
];

function fieldTypeColor(type: FieldType) {
  return FIELD_TYPES.find(t => t.value === type)?.color ?? '#6a6560';
}
function fieldTypeLabel(type: FieldType) {
  return FIELD_TYPES.find(t => t.value === type)?.label ?? type;
}

function makeId() {
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Badge({ type }: { type: FieldType }) {
  const color = fieldTypeColor(type);
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 4,
      background: `${color}18`, border: `1px solid ${color}44`,
      fontFamily: 'var(--font-body)', fontSize: 10,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      color, flexShrink: 0,
    }}>
      {fieldTypeLabel(type)}
    </span>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 23, borderRadius: 12,
        background: value ? '#34C759' : 'var(--admin-border)',
        display: 'flex', alignItems: 'center', padding: '0 2px',
        justifyContent: value ? 'flex-end' : 'flex-start',
        border: 'none', cursor: 'pointer', transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

// ── Field editor (inline) ─────────────────────────────────────────────────────

function FieldEditor({
  field,
  onSave,
  onCancel,
}: {
  field: FormField;
  onSave: (f: FormField) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<FormField>(structuredClone(field));
  const [newOption, setNewOption] = useState('');

  function update<K extends keyof FormField>(k: K, v: FormField[K]) {
    setDraft(d => ({ ...d, [k]: v }));
  }

  function addOption() {
    const o = newOption.trim();
    if (!o) return;
    update('options', [...(draft.options ?? []), o]);
    setNewOption('');
  }

  function removeOption(i: number) {
    update('options', (draft.options ?? []).filter((_, idx) => idx !== i));
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--admin-border)',
    background: 'var(--admin-btn)',
    fontFamily: 'var(--font-body)', fontSize: 14,
    color: 'var(--admin-text)', outline: 'none',
  };

  return (
    <div style={{
      background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
      borderRadius: 10, padding: '16px', display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Type */}
      <div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 6 }}>Field type</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {FIELD_TYPES.map(ft => (
            <button
              key={ft.value}
              onClick={() => {
                update('type', ft.value);
                if (ft.value !== 'checkbox_group') update('options', undefined);
                else if (!draft.options?.length) update('options', ['Option 1']);
              }}
              style={{
                padding: '6px 10px', borderRadius: 6,
                border: draft.type === ft.value ? `1.5px solid ${ft.color}` : '1px solid var(--admin-border)',
                background: draft.type === ft.value ? `${ft.color}14` : 'none',
                fontFamily: 'var(--font-body)', fontSize: 12,
                color: draft.type === ft.value ? ft.color : 'var(--admin-text2)',
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}
            >
              {ft.label}
            </button>
          ))}
        </div>
      </div>

      {/* Label */}
      <div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 6 }}>Question / Label</div>
        <textarea
          value={draft.label}
          onChange={e => update('label', e.target.value)}
          rows={2}
          style={{ ...inp, resize: 'vertical', minHeight: 60, lineHeight: 1.5 }}
        />
      </div>

      {/* Required */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)' }}>Required</span>
        <Toggle value={!!draft.required} onChange={v => update('required', v)} />
      </div>

      {/* Options (checkbox_group only) */}
      {draft.type === 'checkbox_group' && (
        <div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 8 }}>Options</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            {(draft.options ?? []).map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: 6 }}>
                <input
                  value={opt}
                  onChange={e => {
                    const opts = [...(draft.options ?? [])];
                    opts[i] = e.target.value;
                    update('options', opts);
                  }}
                  style={{ ...inp, flex: 1 }}
                />
                <button
                  onClick={() => removeOption(i)}
                  style={{ padding: '0 10px', borderRadius: 6, border: '1px solid var(--admin-border)', background: 'none', color: 'var(--admin-text2)', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={newOption}
              onChange={e => setNewOption(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addOption()}
              placeholder="Add option…"
              style={{ ...inp, flex: 1 }}
            />
            <button
              onClick={addOption}
              style={{ padding: '0 14px', borderRadius: 6, border: 'none', background: 'var(--admin-btn)', color: 'var(--admin-text)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, flexShrink: 0 }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
        <button
          onClick={() => onSave(draft)}
          disabled={!draft.label.trim()}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
            background: 'var(--admin-btn-primary-bg)', color: 'var(--admin-btn-primary-fg)',
            fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
            cursor: draft.label.trim() ? 'pointer' : 'default', opacity: draft.label.trim() ? 1 : 0.5,
          }}
        >
          Save field
        </button>
        <button
          onClick={onCancel}
          style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'none', color: 'var(--admin-text2)', fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function IntakeFormEditor() {
  const [category, setCategory]     = useState<FormCategory>('tan');
  const [config,   setConfig]       = useState<IntakeFormConfig | null>(null);
  const [loading,  setLoading]      = useState(false);
  const [saving,   setSaving]       = useState(false);
  const [saved,    setSaved]        = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [addingNew, setAddingNew]   = useState(false);

  const fetchForm = useCallback(async (cat: FormCategory) => {
    setLoading(true);
    setEditingId(null);
    setAddingNew(false);
    try {
      const res = await fetch(`/api/admin/intake-forms?category=${cat}`);
      setConfig(await res.json());
    } catch { /* keep null */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchForm(category); }, [category, fetchForm]);

  async function save() {
    if (!config) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/intake-forms?category=${category}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }

  async function resetToDefault() {
    if (!confirm('Reset to the built-in default form? This will replace the current form — you can review before saving.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/intake-forms?category=${category}`, { method: 'DELETE' });
      setConfig(await res.json());
      setEditingId(null);
      setAddingNew(false);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  function updateField(updated: FormField) {
    if (!config) return;
    setConfig({ ...config, fields: config.fields.map(f => f.id === updated.id ? updated : f) });
    setEditingId(null);
  }

  function addField(field: FormField) {
    if (!config) return;
    setConfig({ ...config, fields: [...config.fields, field] });
    setAddingNew(false);
  }

  function deleteField(id: string) {
    if (!config) return;
    setConfig({ ...config, fields: config.fields.filter(f => f.id !== id) });
    if (editingId === id) setEditingId(null);
  }

  function moveField(id: string, dir: -1 | 1) {
    if (!config) return;
    const fields = [...config.fields];
    const i = fields.findIndex(f => f.id === id);
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    [fields[i], fields[j]] = [fields[j], fields[i]];
    setConfig({ ...config, fields });
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--admin-border)',
    background: 'var(--admin-btn)',
    fontFamily: 'var(--font-body)', fontSize: 14,
    color: 'var(--admin-text)', outline: 'none',
  };

  return (
    <div style={{ padding: '24px 20px 120px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 400, color: 'var(--admin-text)', margin: 0, letterSpacing: '-0.01em' }}>
          Intake Forms
        </h1>
        {saved && <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#4a9b6f' }}>✓ Saved</span>}
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              border: category === c.value ? '1.5px solid var(--admin-text)' : '1px solid var(--admin-border)',
              background: category === c.value ? 'var(--admin-text-tint)' : 'var(--admin-card)',
              fontFamily: 'var(--font-body)', fontSize: 13,
              fontWeight: category === c.value ? 500 : 400,
              color: category === c.value ? 'var(--admin-text)' : 'var(--admin-text2)',
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)', textAlign: 'center', padding: '40px 0' }}>
          Loading…
        </div>
      )}

      {!loading && config && (
        <>
          {/* Form meta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 6 }}>Form title</div>
              <input value={config.title} onChange={e => setConfig({ ...config, title: e.target.value })} style={inp} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 6 }}>Description (optional)</div>
              <textarea
                value={config.description}
                onChange={e => setConfig({ ...config, description: e.target.value })}
                rows={2}
                style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }}
              />
            </div>
          </div>

          {/* Section label */}
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 12 }}>
            Fields ({config.fields.length})
          </div>

          {/* Field list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {config.fields.map((field, idx) => (
              <div key={field.id}>
                {editingId === field.id ? (
                  <FieldEditor
                    field={field}
                    onSave={updateField}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div style={{
                    background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
                    borderRadius: 10, padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    {/* Reorder */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                      <button
                        onClick={() => moveField(field.id, -1)}
                        disabled={idx === 0}
                        style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? 'var(--admin-border)' : 'var(--admin-muted)', fontSize: 10, lineHeight: 1, padding: '1px 3px' }}
                      >▲</button>
                      <button
                        onClick={() => moveField(field.id, 1)}
                        disabled={idx === config.fields.length - 1}
                        style={{ background: 'none', border: 'none', cursor: idx === config.fields.length - 1 ? 'default' : 'pointer', color: idx === config.fields.length - 1 ? 'var(--admin-border)' : 'var(--admin-muted)', fontSize: 10, lineHeight: 1, padding: '1px 3px' }}
                      >▼</button>
                    </div>

                    {/* Type badge */}
                    <Badge type={field.type} />

                    {/* Label */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {field.label}
                      </div>
                      {field.type === 'checkbox_group' && field.options && (
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)', marginTop: 2 }}>
                          {field.options.slice(0, 4).join(' · ')}{field.options.length > 4 ? ` +${field.options.length - 4} more` : ''}
                        </div>
                      )}
                    </div>

                    {/* Required badge */}
                    {field.required && (
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: '#b5824a', background: '#b5824a18', border: '1px solid #b5824a44', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>
                        Required
                      </span>
                    )}

                    {/* Edit / Delete */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => { setAddingNew(false); setEditingId(field.id); }}
                        style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--admin-border)', background: 'none', color: 'var(--admin-text2)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12 }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteField(field.id)}
                        style={{ padding: '5px 8px', borderRadius: 6, border: 'none', background: 'none', color: 'var(--admin-muted)', cursor: 'pointer', fontSize: 14 }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add field */}
          {addingNew ? (
            <FieldEditor
              field={{ id: makeId(), type: 'text', label: '', required: false }}
              onSave={addField}
              onCancel={() => setAddingNew(false)}
            />
          ) : (
            <button
              onClick={() => { setEditingId(null); setAddingNew(true); }}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 10, marginBottom: 16,
                border: '1.5px dashed var(--admin-border)', background: 'none',
                fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)',
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}
            >
              + Add field
            </button>
          )}

              {/* Save + Reset */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={save}
              disabled={saving}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 10, border: 'none',
                background: 'var(--admin-btn-primary-bg)', color: 'var(--admin-btn-primary-fg)',
                fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
                cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save form'}
            </button>
            <button
              onClick={resetToDefault}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 10,
                border: '1px solid var(--admin-border)', background: 'none',
                fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)',
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}
            >
              Reset to default
            </button>
          </div>
        </>
      )}
    </div>
  );
}
