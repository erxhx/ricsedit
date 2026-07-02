'use client';
import { useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAdminTheme } from './AdminThemeProvider';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

// Primary nav — shown in the persistent bottom tab bar
const BOTTOM_NAV: NavItem[] = [
  { label: 'Today',    href: '/admin',             icon: '◈' },
  { label: 'Schedule', href: '/admin?tab=calendar', icon: '▦' },
  { label: 'Clients',  href: '/admin/clients',      icon: '⌘' },
  { label: 'Reports',  href: '/admin/reports',      icon: '↑' },
  { label: 'Settings', href: '/admin/settings',     icon: '◎' },
];

// Secondary nav — overflow items kept in the drawer
const NAV: NavItem[] = [
  { label: 'Schedule',           href: '/admin',                icon: '▦' },
  { label: 'Clients',            href: '/admin/clients',        icon: '⌘' },
  { label: 'Services & Pricing', href: '/admin/services',       icon: '✦' },
  { label: 'Availability',       href: '/admin/availability',   icon: '◷' },
  { label: 'Intake Forms',       href: '/admin/forms',          icon: '✎' },
  { label: 'Live site',          href: '/admin/site',           icon: '⌁' },
  { label: 'Settings',           href: '/admin/settings',       icon: '◎' },
];

function isActive(href: string, pathname: string, searchParams: ReturnType<typeof useSearchParams>): boolean {
  const isCalendarTab = searchParams.get('tab') === 'calendar';

  if (href === '/admin') {
    // Today is active when on /admin paths but NOT in calendar tab
    return (
      !isCalendarTab && (
        pathname === '/admin' ||
        pathname.startsWith('/admin/day') ||
        pathname.startsWith('/admin/appointments') ||
        pathname.startsWith('/admin/new-booking')
      )
    );
  }
  if (href === '/admin?tab=calendar') {
    // Schedule is active when on /admin with tab=calendar
    return pathname === '/admin' && isCalendarTab;
  }
  return pathname.startsWith(href);
}

export default function AdminHeader({ name }: { name: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const { theme } = useAdminTheme();

  const refresh = useCallback(() => {
    setSpinning(true);
    router.refresh();
    setTimeout(() => setSpinning(false), 600);
  }, [router]);

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setOpen(false);
    router.push('/admin/login');
    router.refresh();
  }

  // Shared style for the buttons inside the top control capsule — the capsule
  // itself carries the glass material; buttons stay transparent.
  const clusterBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 44, height: 38,
    background: 'transparent', border: 'none',
    cursor: 'pointer', color: 'var(--admin-text2)',
    WebkitTapHighlightColor: 'transparent',
  };

  return (
    <>
      {/* ── Top chrome ─────────────────────────────────────────────────────
          Liquid Glass: no opaque slab — a transparent row over a scroll-edge
          effect (progressive blur that fades to nothing), with the controls
          grouped into a single floating glass capsule. */}
      <header
        className="lg-scroll-edge"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 14px 0 20px',
          height: 52,
          position: 'sticky', top: 0, zIndex: 10,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={theme === 'dark' ? '/assets/ES-LogoHori-White.png' : '/assets/ES-LogoHorizontal-Blk.png'}
          alt="Edit Studio"
          style={{ height: 34, width: 'auto', display: 'block' }}
        />

        {/* Grouped control capsule — refresh · menu */}
        <div
          className="lg lg-capsule"
          style={{ display: 'flex', alignItems: 'center', height: 38 }}
        >
          <button onClick={refresh} aria-label="Refresh" className="lg-press" style={{
            ...clusterBtn,
            borderRadius: '9999px 0 0 9999px',
            fontSize: 20, lineHeight: 1,
            transform: spinning ? 'rotate(450deg)' : 'rotate(90deg)',
            transition: spinning ? 'transform 0.6s ease' : 'none',
          }}>
            ↻
          </button>
          <span aria-hidden style={{ width: 1, height: 18, background: 'var(--admin-border-sub)', opacity: 0.8 }} />
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="lg-press" style={{
            ...clusterBtn,
            borderRadius: '0 9999px 9999px 0',
            flexDirection: 'column', gap: 5, padding: 0,
          }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{
                display: 'block', width: 18, height: 1.5,
                background: 'var(--admin-text)', borderRadius: 2,
              }} />
            ))}
          </button>
        </div>
      </header>

      {/* ── Floating + New — the single prominent (tinted) action ─────────── */}
      {pathname !== '/admin/new-booking' && (
        <a
          href="/admin/new-booking"
          className="lg-prominent lg-capsule lg-press"
          style={{
            position: 'fixed',
            bottom: 'calc(92px + env(safe-area-inset-bottom))',
            right: 16,
            zIndex: 30,
            display: 'flex', alignItems: 'center', gap: 6,
            height: 52,
            padding: '0 22px',
            color: '#ece9e2',
            fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600,
            letterSpacing: '0.01em',
            textDecoration: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1, marginTop: -1 }}>+</span>
          New
        </a>
      )}

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 40,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.22s ease',
        }}
      />

      {/* ── Drawer — floating inset glass sheet ────────────────────────────── */}
      <div
        className="lg-sheet"
        style={{
          position: 'fixed',
          top: 'calc(10px + env(safe-area-inset-top))',
          right: 10,
          bottom: 'calc(10px + env(safe-area-inset-bottom))',
          width: 280,
          borderRadius: 28,
          zIndex: 41,
          transform: open ? 'translateX(0)' : 'translateX(calc(100% + 14px))',
          transition: 'transform 0.32s cubic-bezier(0.32, 0.9, 0.35, 1)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >

        {/* Drawer header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 22px', height: 56, flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: 11,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--admin-muted)',
          }}>
            Menu
          </span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="lg-press"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 9999,
              background: 'var(--lg-active-pill)', border: 'none', cursor: 'pointer',
              color: 'var(--admin-text2)', fontSize: 14, lineHeight: 1,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            ✕
          </button>
        </div>

        {/* Nav — active item gets a concentric capsule pill */}
        <nav style={{ flex: 1, padding: '4px 10px', overflowY: 'auto' }}>
          {NAV.map((item) => {
            const active = isActive(item.href, pathname, searchParams);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="lg-press"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '0 14px', height: 50,
                  margin: '2px 0',
                  borderRadius: 18, // concentric with the drawer's 28px radius (28 − 10 inset)
                  background: active ? 'var(--lg-active-pill)' : 'transparent',
                  boxShadow: active ? 'inset 0 1px 0 var(--lg-sheen)' : 'none',
                  textDecoration: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{
                  fontSize: 14, color: active ? 'var(--admin-text)' : 'var(--admin-muted)',
                  width: 16, textAlign: 'center',
                }}>
                  {item.icon}
                </span>
                <span style={{
                  fontFamily: 'var(--font-body)', fontSize: 15,
                  color: active ? 'var(--admin-text)' : 'var(--admin-text3)',
                  fontWeight: active ? 500 : 400,
                }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '16px 20px 22px',
          borderTop: '1px solid var(--admin-border-sub)',
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)',
            marginBottom: 14, letterSpacing: '0.02em',
          }}>
            Signed in as <span style={{ color: 'var(--admin-text3)' }}>{name}</span>
          </div>
          <button
            onClick={logout}
            className="lg-press"
            style={{
              fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--admin-text2)',
              background: 'var(--lg-active-pill)', border: 'none',
              borderRadius: 18, cursor: 'pointer',
              padding: '12px 16px', width: '100%', textAlign: 'left',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* ── Bottom tab bar — floating Liquid Glass capsule ─────────────────── */}
      <nav
        className="lg lg-capsule"
        style={{
          position: 'fixed',
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          display: 'flex',
          padding: '0 2px',
          overflow: 'hidden',
        }}
      >
        {BOTTOM_NAV.map((item) => {
          const active = isActive(item.href, pathname, searchParams);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`lg-tab${active ? ' active' : ''}`}
              style={{
                width: 66, height: 62,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 4, textDecoration: 'none',
                color: active ? 'var(--admin-text)' : 'var(--admin-muted)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{ fontSize: 17, lineHeight: 1 }}>{item.icon}</span>
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: 9,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                fontWeight: active ? 600 : 400,
              }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
