'use client';
import { useState, useEffect } from 'react';

interface BannerConfig {
  enabled: boolean;
  text: string;
  target: 'barber' | 'tan' | 'wax';
  style: 'lime' | 'noir' | 'bone';
}

const TARGET_LABELS: Record<string, string> = {
  barber: 'Barbering',
  tan:    'Sunless',
  wax:    'Waxing',
};

const STYLE_OPTIONS = [
  { value: 'lime', label: 'Lime', bg: '#c8d87a', text: '#1a1a0a' },
  { value: 'noir', label: 'Dark', bg: '#1a1a14', text: '#efeae0' },
  { value: 'bone', label: 'Bone', bg: '#efeae0', text: '#141210' },
];

export default function SiteEditor() {
  const [config,  setConfig]  = useState<BannerConfig | null>(null);
  const [draft,   setDraft]   = useState<BannerConfig | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/site-banner')
      .then(r => r.json())
      .then((d: BannerConfig) => { setConfig(d); setDraft(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const dirty = JSON.stringify(config) !== JSON.stringify(draft);

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/site-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const saved = await res.json() as BannerConfig;
      setConfig(saved);
      setDraft(saved);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof BannerConfig>(key: K, value: BannerConfig[K]) {
    setDraft(d => d ? { ...d, [key]: value } : d);
  }

  const sectionTitle: React.CSSProperties = {
    fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 12,
  };
  const card: React.CSSProperties = {
    background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
    borderRadius: 12, overflow: 'hidden', marginBottom: 20,
  };
  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px', borderBottom: '1px solid var(--admin-border-sub)',
  };
  const label: React.CSSProperties = {
    fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--admin-text)',
  };

  if (loading) return (
    <div style={{ padding: '24px 20px', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)' }}>
      Loading…
    </div>
  );

  if (!draft) return null;

  return (
    <div style={{ padding: '24px 20px 120px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 400, color: 'var(--admin-text)', margin: 0, letterSpacing: '-0.01em' }}>
          Live Site
        </h1>
        {saved && (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#4a9b6f' }}>✓ Saved</span>
        )}
      </div>

      {/* ── Announcement banner ───────────────────────────────────── */}
      <div style={sectionTitle}>Announcement banner</div>

      {/* Preview */}
      {draft.text && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 8, marginBottom: 16,
          background: draft.style === 'lime' ? '#c8d87a' : draft.style === 'noir' ? '#1a1a14' : '#efeae0',
          color: draft.style === 'lime' ? '#1a1a0a' : draft.style === 'noir' ? '#efeae0' : '#141210',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', flex: 1 }}>
            {draft.text}
          </span>
          <span style={{ fontSize: 12, opacity: 0.5 }}>↓</span>
        </div>
      )}

      <div style={card}>
        {/* Enabled toggle */}
        <div style={row}>
          <span style={label}>Show banner</span>
          <button
            onClick={() => update('enabled', !draft.enabled)}
            style={{ width: 44, height: 26, borderRadius: 13, background: draft.enabled ? '#34C759' : 'var(--admin-border)', display: 'flex', alignItems: 'center', padding: '0 3px', transition: 'background 0.2s', justifyContent: draft.enabled ? 'flex-end' : 'flex-start', border: 'none', cursor: 'pointer', flexShrink: 0 }}
          >
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </button>
        </div>

        {/* Message text */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--admin-border-sub)' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)', marginBottom: 8 }}>Message</div>
          <input
            type="text"
            value={draft.text}
            onChange={e => update('text', e.target.value)}
            placeholder="Banner message…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--admin-btn)', border: '1px solid var(--admin-border)',
              borderRadius: 8, padding: '10px 12px',
              fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)',
              outline: 'none',
            }}
          />
        </div>

        {/* Target page */}
        <div style={{ ...row, borderBottom: '1px solid var(--admin-border-sub)' }}>
          <span style={label}>Show on</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['barber', 'tan', 'wax'] as const).map(t => (
              <button
                key={t}
                onClick={() => update('target', t)}
                style={{
                  padding: '7px 12px', borderRadius: 8,
                  border: draft.target === t ? '1.5px solid var(--admin-text)' : '1px solid var(--admin-border)',
                  background: draft.target === t ? 'var(--admin-text-tint)' : 'none',
                  fontFamily: 'var(--font-body)', fontSize: 12,
                  color: draft.target === t ? 'var(--admin-text)' : 'var(--admin-text2)',
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                }}
              >
                {TARGET_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Style */}
        <div style={{ ...row, borderBottom: 'none' }}>
          <span style={label}>Colour</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {STYLE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => update('style', opt.value as BannerConfig['style'])}
                title={opt.label}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: opt.bg,
                  border: draft.style === opt.value ? '2.5px solid var(--admin-text)' : '1.5px solid var(--admin-border)',
                  cursor: 'pointer', flexShrink: 0,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={save}
        disabled={!dirty || saving}
        style={{
          width: '100%', padding: '14px 0', borderRadius: 10,
          background: dirty ? 'var(--admin-btn-primary-bg)' : 'var(--admin-btn)',
          color: dirty ? 'var(--admin-btn-primary-fg)' : 'var(--admin-muted)',
          border: 'none', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
          cursor: dirty ? 'pointer' : 'default',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}
