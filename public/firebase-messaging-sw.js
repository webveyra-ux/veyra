/**
 * Firebase Cloud Messaging Service Worker for VEYRA.
 * Remains safely dormant until Firebase Web Push (VAPID) is configured and requested by the user.
 */
self.addEventListener('push', function (event) {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const notification = payload.notification || {};
    const title = notification.title || 'VEYRA Update';
    const options = {
      body: notification.body || 'You have a new update on VEYRA.',
      icon: '/logo/veyra-mark.svg',
      badge: '/logo/veyra-mark.svg',
      data: payload.data || {},
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    // Ignore malformed push payloads
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.actionUrl) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
