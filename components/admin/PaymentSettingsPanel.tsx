'use client';
import { useEffect, useState } from 'react';
import type { PaymentSettings, CategoryPaymentPolicy } from '@/lib/payment-settings';
import type { ServiceCategory } from '@/lib/services';

const CATEGORY_LABELS: { id: ServiceCategory; label: string }[] = [
  { id: 'barber', label: 'Barbering' },
  { id: 'tan',    label: 'Sunless' },
  { id: 'wax',    label: 'Waxing' },
  { id: 'lashes', label: 'Lashes' },
];

const MODES: { value: CategoryPaymentPolicy['mode']; label: string }[] = [
  { value: 'off',     label: 'Off' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'prepay',  label: 'Prepay' },
];

interface SquareStatus {
  configured: boolean;
  env: string;
  locationId: string | null;
}

export default function PaymentSettingsPanel() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [square, setSquare]     = useState<SquareStatus | null>(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    fetch('/api/admin/payment-settings')
      .then((r) => r.json())
      .then((d) => { setSettings(d.settings); setSquare(d.square); })
      .catch(() => setError('Could not load payment settings.'));
  }, []);

  function update(cat: ServiceCategory, patch: Partial<CategoryPaymentPolicy>) {
    setSettings((s) => s ? { ...s, [cat]: { ...s[cat], ...patch } } : s);
    setSaved(false); setError('');
  }

  async function save() {
    if (!settings) return;
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/admin/payment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setSettings(d.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div style={{ padding: '14px 16px', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)' }}>
        {error || 'Loading…'}
      </div>
    );
  }

  const anyEnabled = Object.values(settings).some((p) => p.mode !== 'off' || p.cardOnFile);

  return (
    <div>
      {/* Square connection state */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--admin-border-sub)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: square?.configured ? (square.locationId ? 'var(--admin-call-text)' : '#b5824a') : 'var(--admin-border)',
        }} />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)' }}>
          {square?.configured
            ? `Square connected (${square.env})${square.locationId ? '' : ' — location pending'}`
            : 'Square not configured — payment steps stay hidden until it is.'}
        </span>
      </div>

      {CATEGORY_LABELS.map(({ id, label }, idx) => {
        const p = settings[id];
        return (
          <div key={id} style={{ padding: '14px 16px', borderBottom: idx < CATEGORY_LABELS.length - 1 ? '1px solid var(--admin-border-sub)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--admin-text)' }}>{label}</span>
              {/* mode segmented control */}
              <div style={{ display: 'flex', background: 'var(--admin-btn)', borderRadius: 9999, padding: 2 }}>
                {MODES.map((m) => {
                  const active = p.mode === m.value;
                  return (
                    <button
                      key={m.value}
                      onClick={() => update(id, { mode: m.value })}
                      style={{
                        fontFamily: 'var(--font-body)', fontSize: 11,
                        fontWeight: active ? 600 : 400,
                        color: active ? 'var(--admin-text)' : 'var(--admin-muted)',
                        background: active ? 'var(--admin-card)' : 'none',
                        border: 'none', borderRadius: 9999,
                        padding: '6px 12px', cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* deposit amount config */}
            {p.mode === 'deposit' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ display: 'flex', background: 'var(--admin-btn)', borderRadius: 8, padding: 2 }}>
                  {(['flat', 'percent'] as const).map((t) => {
                    const active = p.depositType === t;
                    return (
                      <button
                        key={t}
                        onClick={() => update(id, { depositType: t })}
                        style={{
                          fontFamily: 'var(--font-body)', fontSize: 12,
                          fontWeight: active ? 600 : 400,
                          color: active ? 'var(--admin-text)' : 'var(--admin-muted)',
                          background: active ? 'var(--admin-card)' : 'none',
                          border: 'none', borderRadius: 6,
                          padding: '5px 10px', cursor: 'pointer',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        {t === 'flat' ? '$' : '%'}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={p.depositType === 'percent' ? 100 : undefined}
                  value={p.depositValue}
                  onChange={(e) => update(id, { depositValue: Number(e.target.value) })}
                  style={{
                    width: 72, padding: '7px 10px', borderRadius: 8,
                    border: '1px solid var(--admin-border)', background: 'var(--admin-bg)',
                    fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--admin-text)',
                    outline: 'none',
                  }}
                />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)' }}>
                  {p.depositType === 'percent' ? '% of service price' : 'flat deposit'}
                </span>
              </div>
            )}

            {/* card on file toggle */}
            <button
              onClick={() => update(id, { cardOnFile: !p.cardOnFile })}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 0, background: 'none', border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
            >
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text2)' }}>
                Require card on file
              </span>
              <span style={{ width: 40, height: 24, borderRadius: 12, background: p.cardOnFile ? '#34C759' : 'var(--admin-border)', display: 'flex', alignItems: 'center', padding: '0 3px', transition: 'background 0.2s', justifyContent: p.cardOnFile ? 'flex-end' : 'flex-start', flexShrink: 0 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </span>
            </button>
          </div>
        );
      })}

      {/* Save */}
      <div style={{ padding: '12px 16px 16px' }}>
        <button
          onClick={save}
          disabled={saving}
          className="lg-press"
          style={{
            width: '100%', padding: '13px',
            background: saved && !error ? 'var(--admin-call-text)' : 'var(--admin-btn-primary-bg)',
            color: saved && !error ? '#fff' : 'var(--admin-btn-primary-fg)',
            fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
            border: 'none', borderRadius: 9999,
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.7 : 1,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save payment settings'}
        </button>
        {anyEnabled && square && !square.configured && (
          <p style={{ marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-error)', lineHeight: 1.5 }}>
            Payments are enabled but Square isn’t configured — customers won’t see a payment step until it is.
          </p>
        )}
        {error && (
          <p style={{ marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-error)' }}>{error}</p>
        )}
      </div>
    </div>
  );
}
