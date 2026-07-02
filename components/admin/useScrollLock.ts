'use client';
import { useLayoutEffect } from 'react';

// Module-level so overlapping overlays (e.g. sheet over drawer) share one lock.
let lockCount = 0;
let savedY = 0;

/**
 * Locks body scroll while `active` — used by overlays (sheets, drawer) so the
 * page behind them can't scroll. Uses the position:fixed technique because
 * plain `overflow: hidden` doesn't stop iOS Safari touch/rubber-band scrolling.
 * Ref-counted: safe for multiple simultaneous overlays.
 */
export default function useScrollLock(active: boolean) {
  useLayoutEffect(() => {
    if (!active) return;

    if (++lockCount === 1) {
      savedY = window.scrollY;
      const b = document.body.style;
      b.position = 'fixed';
      b.top = `-${savedY}px`;
      b.left = '0';
      b.right = '0';
      b.width = '100%';
      b.overflow = 'hidden';
    }

    return () => {
      if (--lockCount === 0) {
        const b = document.body.style;
        b.position = '';
        b.top = '';
        b.left = '';
        b.right = '';
        b.width = '';
        b.overflow = '';
        window.scrollTo({ top: savedY, behavior: 'instant' as ScrollBehavior });
      }
    };
  }, [active]);
}
