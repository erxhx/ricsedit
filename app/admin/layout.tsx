import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import type { AdminTheme } from '@/lib/admin-theme';
import AdminThemeProvider from '@/components/admin/AdminThemeProvider';

export const metadata: Metadata = {
  title: 'Edit Studio Admin',
  robots: 'noindex, nofollow',
  manifest: '/admin-manifest.json',
  appleWebApp: {
    capable: true,
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
    viewportFit: 'cover',
    themeColor: theme === 'dark' ? '#0d0c0a' : '#efeae0',
  };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialTheme = (cookieStore.get('admin-theme')?.value ?? 'light') as AdminTheme;
  return (
    <AdminThemeProvider initialTheme={initialTheme}>
      {children}
    </AdminThemeProvider>
  );
}
