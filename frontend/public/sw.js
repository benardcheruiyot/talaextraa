self.addEventListener('push', function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Tala Mkopo', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Tala Mkopo';
  const defaultTargetUrl = data.url || '/';
  const options = {
    body: data.body || 'You have a new notification.',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    data: { url: defaultTargetUrl },
    actions: Array.isArray(data.actions) && data.actions.length
      ? data.actions.map((action) => ({
          action: action.action || 'open',
          title: action.title || 'Open',
        }))
      : [
          { action: 'open', title: 'Open app' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
    renotify: true,
    tag: 'loan-app-notification',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
