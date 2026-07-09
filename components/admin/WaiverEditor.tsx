'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { WaiverConfig } from '@/lib/waiver-store';

export default function WaiverEditor() {
  const [config, setConfig] = useState<WaiverConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    fetch('/api/admin/waivers')
      .then((r) => r.json())
      .then((d) => setConfig(d))
      .catch(() => setError('Failed to load waiver config.'));
  }, []);

  function updateField(
    category: 'tan' | 'wax',
    field: 'enabled' | 'text' | 'checkboxLabel',
    value: boolean | string
  ) {
    if (!config) return;
    setSaved(false);
    setConfig({
      ...config,
      [category]: { ...config[category], [field]: value },
    });
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/waivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: '0 0 80px' }}>
      {/* Sub-header */}
      <div className="lg-scroll-edge" style={{
        display: 'flex', alignItems: 'center',
        height: 52, padding: '0 20px',
        position: 'sticky', top: 'calc(52px + var(--admin-safe-top))', zIndex: 9,
        gap: 12,
      }}>
        <Link
          href="/admin/settings"
          style={{
            fontFamily: 'var(--font-body)', fontSize: 13,
            color: 'var(--admin-text3)', textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 6,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          ← Intake Forms
        </Link>
      </div>

      <div style={{ padding: '24px 20px 0' }}>
        {!config ? (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)' }}>
            {error || 'Loading…'}
          </p>
        ) : (
          <>
            {(['tan', 'wax'] as const).map((cat) => {
              const waiver = config[cat];
              const label  = cat === 'tan' ? 'Sunless Tan Waiver' : 'Waxing Waiver';
              return (
                <div key={cat} style={{ marginBottom: 32 }}>
                  <div style={{
                    fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 10,
                  }}>
                    {label}
                  </div>
                  <div style={{
                    background: 'var(--admin-card)',
                    border: '1px solid var(--admin-border)',
                    borderRadius: 12,
                    boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
                    padding: '4px 16px',
                  }}>
                    {/* Required toggle */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 0', borderBottom: '1px solid var(--admin-border-sub)',
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-body)', fontSize: 13,
                        color: 'var(--admin-text3)', flexShrink: 0, marginRight: 16,
                      }}>
                        Required
                      </span>
                      <button
                        onClick={() => updateField(cat, 'enabled', !waiver.enabled)}
                        style={{
                          fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500,
                          padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
                          background: waiver.enabled ? '#34C759' : 'var(--admin-btn)',
                          color: waiver.enabled ? '#fff' : 'var(--admin-text2)',
                          border: waiver.enabled ? 'none' : '1px solid var(--admin-btn-border)',
                        }}
                      >
                        {waiver.enabled ? 'Required' : 'Off'}
                      </button>
                    </div>

                    {/* Waiver text textarea */}
                    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--admin-border-sub)' }}>
                      <div style={{
                        fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)',
                        marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em',
                      }}>
                        Waiver text
                      </div>
                      <textarea
                        value={waiver.text}
                        onChange={(e) => updateField(cat, 'text', e.target.value)}
                        rows={6}
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          background: 'var(--admin-btn)',
                          border: '1px solid var(--admin-border)',
                          borderRadius: 8, padding: '10px 12px',
                          fontFamily: 'var(--font-body)', fontSize: 13,
                          color: 'var(--admin-text)', resize: 'vertical',
                          outline: 'none', lineHeight: 1.5,
                          minHeight: 120,
                        }}
                      />
                    </div>

                    {/* Checkbox label input */}
                    <div style={{ padding: '12px 0' }}>
                      <div style={{
                        fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)',
                        marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em',
                      }}>
                        Checkbox label
                      </div>
                      <input
                        type="text"
                        value={waiver.checkboxLabel}
                        onChange={(e) => updateField(cat, 'checkboxLabel', e.target.value)}
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          background: 'var(--admin-btn)',
                          border: '1px solid var(--admin-border)',
                          borderRadius: 8, padding: '10px 12px',
                          fontFamily: 'var(--font-body)', fontSize: 13,
                          color: 'var(--admin-text)', outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Save button */}
            <button
              onClick={save}
              disabled={saving}
              style={{
                width: '100%', padding: '14px',
                background: saved ? '#7db83e' : 'var(--admin-btn-primary-bg)',
                color: saved ? '#fff' : 'var(--admin-btn-primary-fg)',
                fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
                border: 'none', borderRadius: 12,
                cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.7 : 1,
                transition: 'background 0.2s, color 0.2s',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
            </button>

            {error && (
              <p style={{
                marginTop: 10, fontFamily: 'var(--font-body)', fontSize: 12,
                color: 'var(--admin-error)', lineHeight: 1.5,
              }}>
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
