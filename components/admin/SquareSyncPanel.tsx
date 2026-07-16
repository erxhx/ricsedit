'use client';

/**
 * Square catalog sync — owner panel.
 * Shows the last sync result and offers a "Sync now" button. Prices on the
 * booking site follow the production Square catalog (source of truth).
 */

import { useEffect, useState } from 'react';

interface SyncReport {
  at: string;
  matched: number;
  changes: Array<{ id: string; name: string; from: number; to: number }>;
  unmatched: Array<{ id: string; name: string; price: number }>;
  error?: string;
}

export default function SquareSyncPanel() {
  const [report, setReport]   = useState<SyncReport | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError]     = useState('');
  const [showUnmatched, setShowUnmatched] = useState(false);

  useEffect(() => {
    fetch('/api/admin/square-sync')
      .then((r) => r.json())
      .then((d) => setReport(d.report))
      .catch(() => {});
  }, []);

  async function syncNow() {
    setSyncing(true); setError('');
    try {
      const res = await fetch('/api/admin/square-sync', { method: 'POST' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || d.report?.error || 'Sync failed');
      setReport(d.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  const when = report?.at
    ? new Date(report.at).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text)' }}>
          {report ? (
            report.error
              ? <span style={{ color: 'var(--admin-error)' }}>Last sync failed — {report.error}</span>
              : <>
                  {report.matched} services priced from Square
                  {report.changes.length > 0 && <> · <strong>{report.changes.length} updated</strong></>}
                  {when && <span style={{ color: 'var(--admin-muted)' }}> · {when}</span>}
                </>
          ) : 'No sync has run yet.'}
        </div>
        <button
          onClick={syncNow}
          disabled={syncing}
          style={{
            fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
            padding: '8px 14px', borderRadius: 8, border: '1px solid var(--admin-btn-border)',
            background: 'var(--admin-btn)', color: 'var(--admin-text)',
            cursor: syncing ? 'default' : 'pointer', opacity: syncing ? 0.6 : 1,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
      </div>

      {report && report.changes.length > 0 && !report.error && (
        <div style={{ marginTop: 10, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-text3)', lineHeight: 1.7 }}>
          {report.changes.map((c) => (
            <div key={c.id}>{c.name}: ${c.from} → <strong>${c.to}</strong></div>
          ))}
        </div>
      )}

      {report && report.unmatched.length > 0 && !report.error && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setShowUnmatched((v) => !v)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)', textDecoration: 'underline' }}
          >
            {report.unmatched.length} not in Square {showUnmatched ? '▾' : '▸'}
          </button>
          {showUnmatched && (
            <div style={{ marginTop: 6, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)', lineHeight: 1.7 }}>
              {report.unmatched.map((u) => (
                <div key={u.id}>{u.name} — keeping site price ${u.price}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 10, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-error)' }}>{error}</div>
      )}
    </div>
  );
}
