// Service Worker for Ynii Makeup - Background Reminders, Vibration & Sound
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Xử lý khi người dùng bấm vào thông báo trên điện thoại hoặc máy tính
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const bookingId = event.notification.data?.bookingId;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. Nếu đã có cửa sổ ứng dụng đang mở, focus vào và gửi thông điệp mở chi tiết ca make
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.focus();
          if (bookingId) {
            client.postMessage({ type: 'OPEN_BOOKING_DETAIL', bookingId });
          }
          return;
        }
      }
      // 2. Nếu chưa mở ứng dụng, mở cửa sổ mới kèm tham số bookingId
      if (self.clients.openWindow) {
        const targetUrl = bookingId ? `/?bookingId=${bookingId}` : '/';
        return self.clients.openWindow(targetUrl);
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
    const { delayMs, title, body, tag, data: extraData } = data;
    if (delayMs > 0) {
      setTimeout(() => {
        self.registration.showNotification(title || 'Nhắc lịch Ynii Makeup', {
          body: body || 'Đến giờ nhắc ca makeup!',
          icon: '/icon.svg',
          badge: '/icon.svg',
          vibrate: [300, 150, 300, 150, 300],
          tag: tag || 'makeup-reminder',
          renotify: true,
          requireInteraction: true,
          data: extraData || (data.bookingId ? { bookingId: data.bookingId } : {})
        });
      }, delayMs);
    }
  }
});
