// Service Worker for Ynii Makeup - Background Reminders, Vibration & Sound
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Xử lý khi người dùng bấm vào thông báo trên điện thoại
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Lắng nghe lệnh từ ứng dụng (Client -> Service Worker)
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, data: extraData } = data;
    self.registration.showNotification(title || 'Nhắc lịch Ynii Makeup', {
      body: body || 'Đến giờ nhắc ca makeup!',
      icon: '/icon.svg',
      badge: '/icon.svg',
      vibrate: [300, 150, 300, 150, 300],
      tag: tag || 'makeup-reminder-' + Date.now(),
      renotify: true,
      requireInteraction: true,
      data: extraData || {}
    });
  }

  if (data.type === 'SCHEDULE_REMINDER') {
    const { delayMs, title, body, tag } = data;
    if (delayMs > 0) {
      setTimeout(() => {
        self.registration.showNotification(title || 'Nhắc lịch Ynii Makeup', {
          body: body || 'Đến giờ nhắc ca makeup!',
          icon: '/icon.svg',
          badge: '/icon.svg',
          vibrate: [300, 150, 300, 150, 300],
          tag: tag || 'makeup-reminder-' + Date.now(),
          renotify: true,
          requireInteraction: true
        });
      }, delayMs);
    }
  }
});
