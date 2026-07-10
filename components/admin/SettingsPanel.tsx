'use client';
import { useState } from 'react';
import { useAdminTheme } from './AdminThemeProvider';
import PushToggle from './PushToggle';
import { staffColor, STAFF as ROSTER } from '@/lib/staff';
import type { StaffPermissions } from '@/lib/staff-permissions';

// ── Migration types ───────────────────────────────────────────────────────────

type MigApt = {
  id: string;
  clientName: string;
  clientEmail: string;
  service: string;
  date: string;
  startTime: string;
  staff: string;
  sent: boolean;
};

type MigData = {
  appointments: MigApt[];
  total: number;
  unsent: number;
  alreadySent: number;
};

type MigState = 'idle' | 'loading' | 'ready' | 'sending' | 'done' | 'error';

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtDate(s: string): string {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-CA', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}
function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const p = h >= 12 ? 'pm' : 'am';
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr}:${String(m).padStart(2, '0')} ${p}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SettingsPanel({
  viewerRole,
  initialPermissions = {},
}: {
  viewerRole?: 'owner' | 'esti';
  initialPermissions?: Record<string, StaffPermissions>;
} = {}) {
  const { theme, toggle } = useAdminTheme();

  // ── Staff permissions (owner only) ──────────────────────────────────────────
  const [perms, setPerms]       = useState<Record<string, StaffPermissions>>(initialPermissions);
  const [permSaving, setPermSaving] = useState<string | null>(null);

  async function toggleRevenue(staffId: string) {
    const next = !(perms[staffId]?.canSeeAllRevenue ?? false);
    const optimistic = { ...perms, [staffId]: { ...perms[staffId], canSeeAllRevenue: next } };
    setPerms(optimistic);
    setPermSaving(staffId);
    try {
      const res = await fetch('/api/admin/staff-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [staffId]: { canSeeAllRevenue: next } }),
      });
      if (res.ok) {
        const saved = await res.json() as Record<string, StaffPermissions>;
        setPerms(saved);
      } else {
        setPerms(perms); // revert
      }
    } catch {
      setPerms(perms); // revert
    } finally {
      setPermSaving(null);
    }
  }

  const [migState,  setMigState]  = useState<MigState>('idle');
  const [migData,   setMigData]   = useState<MigData | null>(null);
  const [sentCount, setSentCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [tab,       setTab]       = useState<'pending' | 'sent'>('pending');
  // Per-row resend state: id → 'sending' | 'done' | 'error'
  const [rowState,  setRowState]  = useState<Record<string, 'sending' | 'done' | 'error'>>({});

  async function loadList() {
    setMigState('loading');
    try {
      const res  = await fetch('/api/admin/migration-emails');
      const data = await res.json() as MigData;
      setMigData(data);
      setTab(data.unsent > 0 ? 'pending' : 'sent');
      setMigState('ready');
    } catch {
      setMigState('error');
    }
  }

  async function sendEmails() {
    setMigState('sending');
    try {
      const res  = await fetch('/api/admin/migration-emails', { method: 'POST' });
      const data = await res.json() as { sent: number; failed: number };
      setSentCount(data.sent);
      setFailCount(data.failed);
      // Refresh the list so statuses update
      const refreshed = await fetch('/api/admin/migration-emails').then(r => r.json()) as MigData;
      setMigData(refreshed);
      setTab('sent');
      setMigState('done');
    } catch {
      setMigState('error');
    }
  }

  function reset() {
    setMigState('idle');
    setMigData(null);
    setSentCount(0);
    setFailCount(0);
    setTab('pending');
    setRowState({});
  }

  async function resendOne(id: string) {
    setRowState(s => ({ ...s, [id]: 'sending' }));
    try {
      const res = await fetch('/api/admin/migration-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json() as { sent: number; failed: number };
      setRowState(s => ({ ...s, [id]: data.sent > 0 ? 'done' : 'error' }));
      // Mark row as sent in local data too
      if (data.sent > 0) {
        setMigData(prev => prev ? {
          ...prev,
          appointments: prev.appointments.map(a => a.id === id ? { ...a, sent: true } : a),
          unsent: Math.max(0, prev.unsent - 1),
          alreadySent: prev.alreadySent + 1,
        } : prev);
      }
      // Clear the row state after 2s
      setTimeout(() => setRowState(s => { const n = { ...s }; delete n[id]; return n; }), 2000);
    } catch {
      setRowState(s => ({ ...s, [id]: 'error' }));
    }
  }

  const pendingApts = migData?.appointments.filter(a => !a.sent) ?? [];
  const sentApts    = migData?.appointments.filter(a =>  a.sent) ?? [];
  const listApts    = tab === 'pending' ? pendingApts : sentApts;

  return (
    <div style={{ padding: '24px 20px 48px' }}>
      {/* Page title */}
      <h1 style={{
        fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 400,
        color: 'var(--admin-text)', margin: '0 0 28px', letterSpacing: '-0.01em',
      }}>
        Settings
      </h1>

      {/* ── Appearance ───────────────────────────────────────────────── */}
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: 12,
      }}>
        Appearance
      </div>

      <div style={{
        background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--admin-border-sub)' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--admin-text)', marginBottom: 3 }}>
            Theme
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)' }}>
            {theme === 'light' ? 'Light mode' : 'Dark mode'} · tap to switch
          </div>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          <ThemeBtn label="Light" icon="☀︎" active={theme === 'light'} onClick={theme === 'dark' ? toggle : undefined} position="left" />
          <ThemeBtn label="Dark"  icon="☽"  active={theme === 'dark'}  onClick={theme === 'light' ? toggle : undefined} position="right" />
        </div>
      </div>
      <div style={{ marginTop: 10, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)', lineHeight: 1.5 }}>
        Your preference is saved and will persist across sessions.
      </div>

      {/* ── Notifications ─────────────────────────────────────────────── */}
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--admin-muted)',
        marginTop: 36, marginBottom: 12,
      }}>
        Notifications
      </div>
      <div style={{
        background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <PushToggle />
      </div>

      {/* ── Staff permissions (owner only) ─────────────────────────────── */}
      {viewerRole === 'owner' && (
        <>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--admin-muted)',
            marginTop: 36, marginBottom: 12,
          }}>
            Staff permissions
          </div>

          <div style={{
            background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
            borderRadius: 12, overflow: 'hidden',
          }}>
            {ROSTER.map((m, i) => {
              const on = perms[m.id]?.canSeeAllRevenue ?? false;
              const isOwner = m.role === 'owner';
              return (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                  borderBottom: i < ROSTER.length - 1 ? '1px solid var(--admin-border-sub)' : 'none',
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: staffColor(m.id), flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--admin-text)' }}>{m.name}</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)' }}>
                      {isOwner ? 'Owner — always sees all revenue' : (on ? 'Can see all studio revenue' : 'Sees only their own revenue')}
                    </div>
                  </div>
                  {/* Toggle — owners are locked on */}
                  <button
                    onClick={() => { if (!isOwner && permSaving !== m.id) toggleRevenue(m.id); }}
                    disabled={isOwner || permSaving === m.id}
                    aria-label={`Toggle all-revenue access for ${m.name}`}
                    style={{
                      width: 44, height: 26, borderRadius: 13, border: 'none', padding: '0 3px',
                      background: (isOwner || on) ? '#34C759' : 'var(--admin-border)',
                      display: 'flex', alignItems: 'center',
                      justifyContent: (isOwner || on) ? 'flex-end' : 'flex-start',
                      cursor: isOwner ? 'default' : 'pointer',
                      opacity: permSaving === m.id ? 0.6 : 1,
                      transition: 'background 0.2s', flexShrink: 0,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 10, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)', lineHeight: 1.5 }}>
            Controls whether each person sees studio-wide revenue (Reports, day &amp; week totals) or only their own.
          </div>
        </>
      )}

      {/* ── Booking system migration ──────────────────────────────────── */}
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--admin-muted)',
        marginTop: 36, marginBottom: 12,
      }}>
        Booking system migration
      </div>

      <div style={{
        background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
        borderRadius: 12, overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--admin-text)', marginBottom: 6 }}>
            Send migration emails
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)', lineHeight: 1.55, marginBottom: 16 }}>
            Notifies clients with upcoming confirmed appointments that the booking system has been upgraded and sends them their new manage link. Each appointment is only emailed once.
          </div>

          {/* Idle */}
          {migState === 'idle' && (
            <div style={{ paddingBottom: 16 }}>
              <SettingsBtn onClick={loadList} variant="primary">Load appointment list</SettingsBtn>
            </div>
          )}

          {/* Loading */}
          {migState === 'loading' && (
            <div style={{ paddingBottom: 16, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)' }}>
              Loading appointments…
            </div>
          )}

          {/* Error */}
          {migState === 'error' && (
            <div style={{ paddingBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-danger-text)' }}>
                Something went wrong. Please try again.
              </div>
              <SettingsBtn onClick={reset}>Retry</SettingsBtn>
            </div>
          )}

          {/* Done banner */}
          {migState === 'done' && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#4a9b6f18', border: '1px solid #4a9b6f44',
              borderRadius: 8, padding: '10px 12px', marginBottom: 16,
            }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#4a9b6f' }}>
                ✓ {sentCount} email{sentCount !== 1 ? 's' : ''} sent
                {failCount > 0 && <span style={{ color: 'var(--admin-danger-text)' }}> · {failCount} failed</span>}
              </span>
              <button onClick={reset} style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Tabs + list */}
        {(migState === 'ready' || migState === 'done' || migState === 'sending') && migData && (
          <>
            {/* Tab bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--admin-border)', paddingLeft: 16 }}>
              {(['pending', 'sent'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: tab === t ? 500 : 400,
                    color: tab === t ? 'var(--admin-text)' : 'var(--admin-muted)',
                    background: 'none', border: 'none',
                    borderBottom: tab === t ? '2px solid var(--admin-text)' : '2px solid transparent',
                    padding: '10px 12px 10px 0', marginRight: 8,
                    cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {t === 'pending'
                    ? `Pending (${pendingApts.length})`
                    : `Sent (${sentApts.length})`}
                </button>
              ))}
            </div>

            {/* Appointment rows */}
            <div style={{ maxHeight: 340, overflowY: 'auto', overscrollBehavior: 'contain' }}>
              {listApts.length === 0 ? (
                <div style={{ padding: '20px 16px', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)', textAlign: 'center' }}>
                  {tab === 'pending' ? 'No pending appointments.' : 'No emails sent yet.'}
                </div>
              ) : (
                listApts.map((apt, i) => (
                  <div
                    key={apt.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px',
                      borderBottom: i < listApts.length - 1 ? '1px solid var(--admin-border-sub)' : 'none',
                    }}
                  >
                    {/* Staff dot */}
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      background: staffColor(apt.staff),
                    }} />

                    {/* Client + service */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--admin-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {apt.clientName}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)', marginTop: 1 }}>
                        {apt.service}
                      </div>
                    </div>

                    {/* Date + time */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-text2)' }}>
                        {fmtDate(apt.date)}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)', marginTop: 1 }}>
                        {fmtTime(apt.startTime)}
                      </div>
                    </div>

                    {/* Status / resend */}
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      {rowState[apt.id] === 'sending' ? (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-muted)' }}>sending…</span>
                      ) : rowState[apt.id] === 'done' ? (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#4a9b6f' }}>✓ sent</span>
                      ) : rowState[apt.id] === 'error' ? (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--admin-danger-text)' }}>failed</span>
                      ) : apt.sent ? (
                        <button
                          onClick={() => resendOne(apt.id)}
                          style={{
                            fontFamily: 'var(--font-body)', fontSize: 11,
                            color: 'var(--admin-link)', background: 'none',
                            border: 'none', cursor: 'pointer', padding: 0,
                            WebkitTapHighlightColor: 'transparent',
                          }}
                        >
                          Resend
                        </button>
                      ) : (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--admin-muted)', letterSpacing: '0.04em' }}>
                          {apt.clientEmail?.split('@')[1] ? `@${apt.clientEmail.split('@')[1]}` : '—'}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer action */}
            {(migState === 'ready' || migState === 'sending') && pendingApts.length > 0 && (
              <div style={{ padding: '14px 16px', borderTop: '1px solid var(--admin-border)' }}>
                {migState === 'sending' ? (
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)' }}>
                    Sending…
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <SettingsBtn onClick={sendEmails} variant="primary">
                      Send {pendingApts.length} email{pendingApts.length !== 1 ? 's' : ''}
                    </SettingsBtn>
                    <SettingsBtn onClick={reset}>Cancel</SettingsBtn>
                  </div>
                )}
              </div>
            )}

            {(migState === 'ready' || migState === 'done') && pendingApts.length === 0 && (
              <div style={{ padding: '14px 16px', borderTop: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#4a9b6f' }}>
                  All upcoming clients have been notified.
                </div>
                {sentApts.length > 0 && (
                  <button
                    onClick={async () => {
                      setMigState('sending');
                      const res = await fetch('/api/admin/migration-emails', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ force: true }),
                      }).then(r => r.json()) as { sent: number; failed: number };
                      setSentCount(res.sent);
                      setFailCount(res.failed);
                      const refreshed = await fetch('/api/admin/migration-emails').then(r => r.json()) as MigData;
                      setMigData(refreshed);
                      setMigState('done');
                    }}
                    style={{
                      fontFamily: 'var(--font-body)', fontSize: 12,
                      color: 'var(--admin-link)', background: 'none',
                      border: 'none', cursor: 'pointer', padding: 0,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    Resend all
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ marginTop: 10, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)', lineHeight: 1.5 }}>
        Safe to run multiple times — appointments that have already been emailed are skipped.
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SettingsBtn({
  children, onClick, variant = 'ghost',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'ghost' | 'primary';
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-body)', fontSize: 13,
        padding: '10px 16px', borderRadius: 8,
        background: variant === 'primary' ? 'var(--admin-btn-primary-bg)' : 'var(--admin-btn)',
        color: variant === 'primary' ? 'var(--admin-btn-primary-fg)' : 'var(--admin-text)',
        border: variant === 'primary' ? 'none' : '1px solid var(--admin-border)',
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
    </button>
  );
}

function ThemeBtn({
  label, icon, active, onClick, position,
}: {
  label: string; icon: string; active: boolean;
  onClick?: () => void; position: 'left' | 'right';
}) {
  return (
    <button
      onClick={onClick}
      disabled={active}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 6, padding: '20px 0',
        background: active ? 'var(--admin-nav-active)' : 'none',
        border: 'none',
        borderLeft: position === 'right' ? '1px solid var(--admin-border-sub)' : 'none',
        cursor: active ? 'default' : 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background 0.15s',
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1, color: active ? '#7db83e' : 'var(--admin-muted)', transition: 'color 0.15s' }}>
        {icon}
      </span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: active ? 500 : 400, color: active ? 'var(--admin-text)' : 'var(--admin-muted)', transition: 'color 0.15s' }}>
        {label}
      </span>
      {active && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#7db83e' }} />}
    </button>
  );
}
