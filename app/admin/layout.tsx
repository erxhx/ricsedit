import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Edit Studio Admin',
  robots: 'noindex, nofollow',
  manifest: '/admin-manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ES Admin',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0d0c0a',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0d0c0a',
      color: '#ece9e2',
      // Safe area insets for iPhone notch / home indicator
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {children}
    </div>
  );
}
