'use client';
import { useEffect, useRef } from 'react';

/**
 * Self-updating PWA: compares the build SHA this page was served with against
 * /api/version, and reloads when a newer deploy is live. iOS standalone PWAs
 * cache assets aggressively (force-quitting doesn't flush them), so without
 * this, stale chrome/JS can persist across deploys.
 *
 * Checks on resume (visibilitychange → visible) and every 10 minutes while
 * open. Skips the reload if the user is mid-interaction (focused input or an
 * open sheet/drawer) and retries on the next check instead.
 */
export default function UpdateCheck({ current }: { current: string }) {
  const checking = useRef(false);

  useEffect(() => {
    if (current === 'dev') return; // local dev — nothing to compare

    async function check() {
      if (checking.current || document.visibilityState !== 'visible') return;
      checking.current = true;
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const { version } = await res.json() as { version: string };
        if (!version || version === current) return;

        // New build live. Don't yank the page out from under an interaction.
        // Note: overlays test for on-screen presence, not existence — the
        // drawer is always mounted, just translated off-screen when closed.
        const typing =
          document.activeElement instanceof HTMLElement &&
          /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
        const overlayOpen = [...document.querySelectorAll('.lg-sheet, .lg-bottom-sheet')]
          .some(el => {
            const r = el.getBoundingClientRect();
            return r.left < window.innerWidth && r.right > 0 && r.top < window.innerHeight && r.bottom > 0;
          });
        if (!typing && !overlayOpen) window.location.reload();
      } catch { /* offline — try again next time */ }
      finally { checking.current = false; }
    }

    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    const interval = setInterval(check, 10 * 60 * 1000);
    check(); // once on mount

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, [current]);

  return null;
}
