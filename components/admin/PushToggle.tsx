'use client';
import { useEffect, useState } from 'react';

type PushState =
  | 'loading'        // probing support/permission
  | 'unsupported'    // browser can't do Web Push
  | 'need-install'   // iOS Safari tab — must be installed to Home Screen first
  | 'denied'         // permission previously refused
  | 'off'
  | 'on'
  | 'busy';

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function PushToggle() {
  const [state, setState] = useState<PushState>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        // iOS Safari (non-installed) hides PushManager — installing enables it
        const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
        const standalone = window.matchMedia('(display-mode: standalone)').matches
          || (navigator as unknown as { standalone?: boolean }).standalone === true;
        setState(isIOS && !standalone ? 'need-install' : 'unsupported');
        return;
      }
      if (Notification.permission === 'denied') { setState('denied'); return; }
      try {
        const reg = await navigator.serviceWorker.getRegistration('/admin-sw.js');
        const sub = await reg?.pushManager.getSubscription();
        setState(sub ? 'on' : 'off');
      } catch { setState('off'); }
    })();
  }, []);

  async function enable() {
    setState('busy'); setError('');
    try {
      // Permission prompt must happen inside the tap handler (iOS requirement)
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'off'); return; }

      const reg = await navigator.serviceWorker.register('/admin-sw.js');
      await navigator.serviceWorker.ready;

      const { publicKey } = await fetch('/api/admin/push').then((r) => r.json());
      if (!publicKey) { setError('Push keys not configured on the server yet.'); setState('off'); return; }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const res = await fetch('/api/admin/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error('save failed');
      setState('on');
    } catch (e) {
      console.error('[push] enable failed', e);
      setError('Could not enable notifications on this device.');
      setState('off');
    }
  }

  async function disable() {
    setState('busy'); setError('');
    try {
      const reg = await navigator.serviceWorker.getRegistration('/admin-sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/admin/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState('off');
    } catch {
      setError('Could not disable — try again.');
      setState('on');
    }
  }

  const on = state === 'on';
  const description =
    state === 'need-install' ? 'Add the admin to your Home Screen first (Share → Add to Home Screen), then enable here.'
    : state === 'unsupported' ? 'This browser doesn’t support push notifications.'
    : state === 'denied' ? 'Notifications are blocked for this app in your device settings.'
    : on ? 'This device gets a buzz for new bookings, cancellations and reschedules.'
    : 'Get notified on this device when your day changes.';

  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--admin-text)', marginBottom: 3 }}>
            Push notifications
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-muted)', lineHeight: 1.5 }}>
            {description}
          </div>
        </div>
        {(state === 'on' || state === 'off' || state === 'busy') && (
          <button
            onClick={() => (on ? disable() : enable())}
            disabled={state === 'busy'}
            aria-label="Toggle push notifications on this device"
            style={{
              width: 44, height: 26, borderRadius: 13, border: 'none', padding: '0 3px',
              background: on ? '#34C759' : 'var(--admin-border)',
              display: 'flex', alignItems: 'center',
              justifyContent: on ? 'flex-end' : 'flex-start',
              cursor: 'pointer', opacity: state === 'busy' ? 0.6 : 1,
              transition: 'background 0.2s', flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </button>
        )}
      </div>
      {error && (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--admin-error)', marginTop: 8 }}>
          {error}
        </div>
      )}
    </div>
  );
}
