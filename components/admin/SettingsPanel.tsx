'use client';
import { useState, useEffect } from 'react';
import { useAdminTheme } from './AdminThemeProvider';

type MigrationState = 'idle' | 'loading' | 'previewed' | 'sending' | 'done' | 'error';

export default function SettingsPanel() {
  const { theme, toggle } = useAdminTheme();

  const [migState,   setMigState]   = useState<MigrationState>('idle');
  const [migPreview, setMigPreview] = useState<{ total: number; unsent: number; alreadySent: number } | null>(null);
  const [migResult,  setMigResult]  = useState<{ sent: number; failed: number } | null>(null);

  async function previewMigration() {
    setMigState('loading');
    try {
      const res = await fetch('/api/admin/migration-emails');
      const data = await res.json();
      setMigPreview(data);
      setMigState('previewed');
    } catch {
      setMigState('error');
    }
  }

  async function sendMigrationEmails() {
    setMigState('sending');
    try {
      const res = await fetch('/api/admin/migration-emails', { method: 'POST' });
      const data = await res.json();
      setMigResult(data);
      setMigState('done');
    } catch {
      setMigState('error');
    }
  }

  return (
    <div style={{ padding: '24px 20px 48px' }}>
      {/* Page title */}
      <h1 style={{
        fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 400,
        color: 'var(--admin-text)', margin: '0 0 28px', letterSpacing: '-0.01em',
      }}>
        Settings
      </h1>

      {/* Appearance section */}
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
        {/* Row label */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--admin-border-sub)',
        }}>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: 15,
            color: 'var(--admin-text)', marginBottom: 3,
          }}>
            Theme
          </div>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)',
          }}>
            {theme === 'light' ? 'Light mode' : 'Dark mode'} · tap to switch
          </div>
        </div>

        {/* Theme toggle buttons */}
        <div style={{ display: 'flex', gap: 0 }}>
          <ThemeBtn
            label="Light"
            icon="☀︎"
            active={theme === 'light'}
            onClick={theme === 'dark' ? toggle : undefined}
            position="left"
          />
          <ThemeBtn
            label="Dark"
            icon="☽"
            active={theme === 'dark'}
            onClick={theme === 'light' ? toggle : undefined}
            position="right"
          />
        </div>
      </div>

      {/* Brief description */}
      <div style={{
        marginTop: 10,
        fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)',
        lineHeight: 1.5,
      }}>
        Your preference is saved and will persist across sessions.
      </div>

      {/* ── Migration emails ──────────────────────────────────────────── */}
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--admin-muted)',
        marginTop: 36, marginBottom: 12,
      }}>
        Booking system migration
      </div>

      <div style={{
        background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
        borderRadius: 12, padding: '16px',
      }}>
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 15,
          color: 'var(--admin-text)', marginBottom: 6,
        }}>
          Send migration emails
        </div>
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)',
          lineHeight: 1.55, marginBottom: 16,
        }}>
          Notifies clients with upcoming confirmed appointments that the booking system has been upgraded and gives them their new manage link. Each appointment is only emailed once.
        </div>

        {/* States */}
        {migState === 'idle' && (
          <SettingsBtn onClick={previewMigration}>Preview</SettingsBtn>
        )}

        {migState === 'loading' && (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)' }}>
            Checking appointments…
          </div>
        )}

        {migState === 'previewed' && migPreview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              background: 'var(--admin-btn)', border: '1px solid var(--admin-border)',
              borderRadius: 8, padding: '12px 14px',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text)' }}>
                <strong>{migPreview.unsent}</strong> email{migPreview.unsent !== 1 ? 's' : ''} to send
              </div>
              {migPreview.alreadySent > 0 && (
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)' }}>
                  {migPreview.alreadySent} already sent previously
                </div>
              )}
              {migPreview.unsent === 0 && (
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#4a9b6f' }}>
                  All upcoming clients have already been notified.
                </div>
              )}
            </div>
            {migPreview.unsent > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <SettingsBtn onClick={sendMigrationEmails} variant="primary">
                  Send {migPreview.unsent} email{migPreview.unsent !== 1 ? 's' : ''}
                </SettingsBtn>
                <SettingsBtn onClick={() => { setMigState('idle'); setMigPreview(null); }}>
                  Cancel
                </SettingsBtn>
              </div>
            )}
          </div>
        )}

        {migState === 'sending' && (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-muted)' }}>
            Sending emails…
          </div>
        )}

        {migState === 'done' && migResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#4a9b6f' }}>
              ✓ {migResult.sent} email{migResult.sent !== 1 ? 's' : ''} sent successfully
              {migResult.failed > 0 && ` · ${migResult.failed} failed`}
            </div>
            <SettingsBtn onClick={() => { setMigState('idle'); setMigPreview(null); setMigResult(null); }}>
              Done
            </SettingsBtn>
          </div>
        )}

        {migState === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-danger-text)' }}>
              Something went wrong. Please try again.
            </div>
            <SettingsBtn onClick={() => setMigState('idle')}>Retry</SettingsBtn>
          </div>
        )}
      </div>

      <div style={{
        marginTop: 10,
        fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)',
        lineHeight: 1.5,
      }}>
        Safe to run multiple times — appointments that have already been emailed are skipped.
      </div>
    </div>
  );
}

function SettingsBtn({
  children,
  onClick,
  variant = 'ghost',
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
  label,
  icon,
  active,
  onClick,
  position,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick?: () => void;
  position: 'left' | 'right';
}) {
  return (
    <button
      onClick={onClick}
      disabled={active}
      style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
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
      <span style={{
        fontSize: 22, lineHeight: 1,
        color: active ? '#7db83e' : 'var(--admin-muted)',
        transition: 'color 0.15s',
      }}>
        {icon}
      </span>
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: 13,
        fontWeight: active ? 500 : 400,
        color: active ? 'var(--admin-text)' : 'var(--admin-muted)',
        transition: 'color 0.15s',
      }}>
        {label}
      </span>
      {active && (
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: '#7db83e',
        }} />
      )}
    </button>
  );
}
