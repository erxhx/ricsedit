/**
 * Admin PWA service worker — Web Push only.
 *
 * Deliberately NO fetch handler and NO caching: the admin relies on fresh
 * server HTML plus its own version check (UpdateCheck) for updates, and a
 * caching SW would fight both. This worker exists purely so iOS can deliver
 * push notifications to the installed app.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* fall through */ }
  const title = data.title || 'Edit Studio';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      data: { url: data.url || '/admin' },
      icon: '/assets/logo-black.png',
      badge: '/assets/logo-black.png',
      tag: data.tag, // collapse repeat updates for the same appointment
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/admin';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        if (win.url.includes('/admin')) { win.focus(); win.navigate(url); return; }
      }
      return self.clients.openWindow(url);
    }),
  );
});
