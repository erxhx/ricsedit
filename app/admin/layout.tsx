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
    // 'default' gives dark status text, so the bar can sit on the app's own
    // (usually light) colour and read as part of the page.
    //
    // This was briefly 'black-translucent' plus a hardcoded #141210 strip,
    // to stop iOS painting a grey slab from the SYSTEM theme when the phone
    // was dark and the app light. That fixed the slab but made the strip
    // permanently black over a beige app — worse in the common case, and it
    // had only been checked against a simulated composition, never a real
    // installed PWA. black-translucent also forces WHITE status text, so it
    // can never sit on a light strip; 'default' is the only way to get the
    // seamless look. The slab is addressed in generateViewport instead.
    statusBarStyle: 'default',
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
    // Pinned to the ADMIN theme for both colour schemes, deliberately ignoring
    // prefers-color-scheme. A single unqualified theme-color let iOS fall back
    // to its own system-theme treatment — a grey slab over the beige app when
    // the phone was in dark mode. Declaring the same colour for both media
    // cases leaves it nothing to choose.
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: theme === 'dark' ? '#0d0c0a' : '#efeae0' },
      { media: '(prefers-color-scheme: dark)', color: theme === 'dark' ? '#0d0c0a' : '#efeae0' },
    ],
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
