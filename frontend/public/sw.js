self.addEventListener('push', function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Tala Mkopo', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Tala Mkopo';
  const defaultTargetUrl = data.url || '/';
  const notificationId = data.notificationId || 'payment-notification-' + Date.now();
  const isPaymentNotification = (data.body || '').toLowerCase().includes('m-pesa') || (data.body || '').toLowerCase().includes('payment');

  const options = {
    body: data.body || 'You have a new notification.',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    data: {
      url: defaultTargetUrl,
      notificationId: notificationId,
      isPaymentNotification: isPaymentNotification,
      checkoutRequestId: data.checkoutRequestId || null,
    },
    actions: Array.isArray(data.actions) && data.actions.length
      ? data.actions.map((action) => ({
          action: action.action || 'open',
          title: action.title || 'Open',
        }))
      : [
          { action: 'open', title: 'Open app' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
    requireInteraction: true,
    renotify: true,
    tag: 'loan-app-notification',
    vibrate: [200, 100, 200],
  };

  console.log('[Service Worker] Push received:', { title, body: data.body, isPaymentNotification, actions: options.actions });
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  console.log('[Service Worker] Notification clicked with action:', event.action, 'data:', event.notification.data);
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  if (event.action === 'dismiss') {
    console.log('[Service Worker] User dismissed notification');
    return;
  }

  // For payment notifications, open with payment status check
  const isPaymentNotification = event.notification.data && event.notification.data.isPaymentNotification;
  const checkoutRequestId = event.notification.data && event.notification.data.checkoutRequestId;
  
  const urlToOpen = isPaymentNotification && checkoutRequestId
    ? (targetUrl.endsWith('/apply') || targetUrl.endsWith('/loan')
        ? targetUrl + (targetUrl.includes('?') ? '&' : '?') + 'checkPayment=' + checkoutRequestId
        : targetUrl.replace(/\/?$/, '') + '/apply?checkPayment=' + checkoutRequestId)
    : targetUrl;

  console.log('[Service Worker] Opening URL:', urlToOpen, 'isPayment:', isPaymentNotification);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if ('focus' in client) {
          console.log('[Service Worker] Focusing existing client');
          client.focus();
          // Send message to client to check payment
          if (isPaymentNotification && checkoutRequestId) {
            client.postMessage({
              type: 'CHECK_PAYMENT',
              checkoutRequestId: checkoutRequestId,
            });
          }
          return;
        }
      }
      if (clients.openWindow) {
        console.log('[Service Worker] Opening new window');
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
