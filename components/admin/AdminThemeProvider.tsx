'use client';
import { createContext, useContext, useState, useCallback } from 'react';
import type { AdminTheme } from '@/lib/admin-theme';
import { THEME_VARS } from '@/lib/admin-theme';

interface ThemeCtx {
  theme: AdminTheme;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx>({ theme: 'light', toggle: () => {} });

export function useAdminTheme() { return useContext(Ctx); }

export default function AdminThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: AdminTheme;
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<AdminTheme>(initialTheme);

  const toggle = useCallback(async () => {
    const next: AdminTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try {
      await fetch('/api/admin/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: next }),
      });
    } catch { /* non-critical — preference saved on next reload via cookie */ }
  }, [theme]);

  const vars = THEME_VARS[theme];

  return (
    <Ctx.Provider value={{ theme, toggle }}>
      <div
        style={Object.assign(
          {
            minHeight: '100dvh',
            background: 'var(--admin-bg)',
            color: 'var(--admin-text)',
            // Shared by every sticky header so they pin below the status bar /
            // Dynamic Island in the installed PWA (0px in a normal browser tab).
            '--admin-safe-top': 'env(safe-area-inset-top, 0px)',
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'calc(96px + env(safe-area-inset-bottom))',
            colorScheme: theme === 'dark' ? 'dark' : 'light',
          },
          vars,
        ) as React.CSSProperties}
      >
        {/* Status-bar strip (installed PWA only): with black-translucent the
            page extends under the iOS status bar; this ink strip backs the
            white system text (time/battery) so it's readable and on-brand in
            both themes. Height is the safe-area inset — 0 in a browser tab. */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          height: 'env(safe-area-inset-top, 0px)',
          background: '#141210',
          zIndex: 100, pointerEvents: 'none',
        }} />
        {/* Ambient colour pools so the Liquid Glass chrome has light to bend —
            warm at the top, a faint cool pool low where the tab bar floats. */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none',
          background: theme === 'dark'
            ? `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(105,84,44,0.16) 0%, transparent 70%),
               radial-gradient(ellipse 90% 45% at 50% 108%, rgba(64,74,96,0.12) 0%, transparent 70%)`
            : `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(222,200,158,0.32) 0%, transparent 70%),
               radial-gradient(ellipse 90% 45% at 50% 108%, rgba(176,190,208,0.22) 0%, transparent 70%)`,
        }} />
        {children}
      </div>
    </Ctx.Provider>
  );
}
