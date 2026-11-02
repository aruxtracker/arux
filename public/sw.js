// ARUX Service Worker — handles background push notifications
const CACHE_VERSION = 'arux-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = { title: 'ARUX', body: 'You have a new notification', url: '/' };
  try {
    if (event.data) {
      const text = event.data.text();
      try { payload = { ...payload, ...JSON.parse(text) }; }
      catch { payload.body = text; }
    }
  } catch (e) { /* keep defaults */ }

  const options = {
    body: payload.body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [200, 100, 200],
    tag: payload.tag || 'arux-notification',
    renotify: true,
    requireInteraction: false,
    data: { url: payload.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ('focus' in client) {
          client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
