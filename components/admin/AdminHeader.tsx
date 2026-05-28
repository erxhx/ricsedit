'use client';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  soon?: boolean;
}

const NAV: NavItem[] = [
  { label: 'Schedule',           href: '/admin',           icon: '▦' },
  { label: 'Clients',            href: '/admin/clients',   icon: '⌘' },
  { label: 'Services & Pricing', href: '/admin/services',  icon: '✦' },
  { label: 'Settings',           href: '/admin/settings',  icon: '◎', soon: true },
];

function isActive(href: string, pathname: string): boolean {
  if (href === '/admin') {
    return (
      pathname === '/admin' ||
      pathname.startsWith('/admin/day') ||
      pathname.startsWith('/admin/appointments') ||
      pathname.startsWith('/admin/new-booking')
    );
  }
  return pathname.startsWith(href);
}

export default function AdminHeader({ name }: { name: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setOpen(false);
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <>
      {/* Top bar */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        height: 52,
        background: '#0d0c0a',
        borderBottom: '1px solid #252320',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
          letterSpacing: '0.06em', color: '#ece9e2',
        }}>
          Edit Studio
        </span>

        {/* Hamburger button */}
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            gap: 5, width: 36, height: 36,
            background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0 6px 6px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {[0, 1, 2].map((i) => (
            <span key={i} style={{
              display: 'block', width: 20, height: 1.5,
              background: '#ece9e2', borderRadius: 2,
            }} />
          ))}
        </button>
      </header>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.65)',
          zIndex: 40,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.22s ease',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 270,
        background: '#131210',
        borderLeft: '1px solid #252320',
        zIndex: 41,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Drawer header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', height: 52,
          borderBottom: '1px solid #252320', flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: 11,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4a4844',
          }}>
            Menu
          </span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#6b6760', fontSize: 18, lineHeight: 1,
              padding: '4px', WebkitTapHighlightColor: 'transparent',
            }}
          >
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          {NAV.map((item) => {
            const active = isActive(item.href, pathname);

            if (item.soon) {
              return (
                <div
                  key={item.href}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 20px', height: 52,
                    borderLeft: '2px solid transparent',
                    opacity: 0.4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 14, color: '#6b6760', width: 16, textAlign: 'center' }}>
                      {item.icon}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-body)', fontSize: 15, color: '#6b6760',
                    }}>
                      {item.label}
                    </span>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: 9,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: '#4a4844', border: '1px solid #2a2826',
                    padding: '2px 7px', borderRadius: 10,
                  }}>
                    soon
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '0 20px', height: 52,
                  borderLeft: `2px solid ${active ? '#7db83e' : 'transparent'}`,
                  background: active ? '#1a1f14' : 'transparent',
                  textDecoration: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{
                  fontSize: 14, color: active ? '#7db83e' : '#6b6760',
                  width: 16, textAlign: 'center',
                }}>
                  {item.icon}
                </span>
                <span style={{
                  fontFamily: 'var(--font-body)', fontSize: 15,
                  color: active ? '#ece9e2' : '#9a9590',
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
          padding: '16px 20px 32px',
          borderTop: '1px solid #1e1d1a',
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: 12, color: '#4a4844',
            marginBottom: 14, letterSpacing: '0.02em',
          }}>
            Signed in as <span style={{ color: '#6b6760' }}>{name}</span>
          </div>
          <button
            onClick={logout}
            style={{
              fontFamily: 'var(--font-body)', fontSize: 13, color: '#6b6760',
              background: 'none', border: '1px solid #252320',
              borderRadius: 8, cursor: 'pointer',
              padding: '10px 16px', width: '100%', textAlign: 'left',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
