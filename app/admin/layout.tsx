import type { Metadata, Viewport } from 'next';

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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#efeae0',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#efeae0',
      color: '#141210',
      // Safe area insets for iPhone notch / home indicator
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {children}
    </div>
  );
}
