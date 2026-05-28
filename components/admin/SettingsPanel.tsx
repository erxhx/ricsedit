'use client';
import { useAdminTheme } from './AdminThemeProvider';

export default function SettingsPanel() {
  const { theme, toggle } = useAdminTheme();

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
    </div>
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
