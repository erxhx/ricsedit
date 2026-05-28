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
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            colorScheme: theme === 'dark' ? 'dark' : 'light',
          },
          vars,
        ) as React.CSSProperties}
      >
        {children}
      </div>
    </Ctx.Provider>
  );
}
