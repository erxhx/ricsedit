import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import type { AdminTheme } from '@/lib/admin-theme';
import AdminThemeProvider from '@/components/admin/AdminThemeProvider';
import UpdateCheck from '@/components/admin/UpdateCheck';

export const metadata: Metadata = {
  title: 'Edit Studio Admin',
  robots: 'noindex, nofollow',
  manifest: '/admin-manifest.json',
  appleWebApp: {
    capable: true,
    // Page extends under the status bar; the theme provider paints that zone
    // with an ink strip so the white system text is always readable — with
    // 'default', iOS colours the bar from the SYSTEM theme (grey slab over
    // the beige app when the phone is in dark mode).
    statusBarStyle: 'black-translucent',
    title: 'ES Admin',
  },
};

export async function generateViewport() {
  const cookieStore = await cookies();
  const theme = (cookieStore.get('admin-theme')?.value ?? 'light') as AdminTheme;
  return {
    width: 'device-width',
    initialScale: 1,
    // Stops iOS auto-zooming when focusing the admin's sub-16px inputs.
    // Users can still pinch-zoom — iOS ignores the cap for user gestures.
    maximumScale: 1,
    viewportFit: 'cover',
    themeColor: theme === 'dark' ? '#0d0c0a' : '#efeae0',
  };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialTheme = (cookieStore.get('admin-theme')?.value ?? 'light') as AdminTheme;
  const buildSha = (process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev').slice(0, 12);
  return (
    <AdminThemeProvider initialTheme={initialTheme}>
      <UpdateCheck current={buildSha} />
      {children}
    </AdminThemeProvider>
  );
}
