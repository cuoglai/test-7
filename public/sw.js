// Service Worker for Ynii Makeup - Background Reminders, Vibration & Sound
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Quản lý bộ đếm và danh sách đã thông báo để chống spam / lặp thông báo
const scheduledTimers = new Map(); // tag -> timerId
const notifiedTags = new Set(); // tags đã được hiển thị thông báo

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

  // Đồng bộ danh sách các lịch đã được thông báo từ client (localStorage)
  if (data.type === 'SYNC_NOTIFIED_TAGS') {
    if (Array.isArray(data.tags)) {
      data.tags.forEach((tag) => notifiedTags.add(tag));
    }
    return;
  }

  // Hủy hẹn giờ cho ca make (khi ca make bị hủy, đã hoàn thành hoặc đổi giờ)
  if (data.type === 'CANCEL_REMINDER') {
    const { tag } = data;
    if (tag && scheduledTimers.has(tag)) {
      clearTimeout(scheduledTimers.get(tag));
      scheduledTimers.delete(tag);
    }
    return;
  }

  // Hiển thị thông báo ngay lập tức (ví dụ: bấm nút Thử thông báo)
  if (data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, data: extraData } = data;
    self.registration.showNotification(title || 'Nhắc lịch Ynii Makeup', {
      body: body || 'Đến giờ nhắc ca makeup!',
      icon: '/icon.svg',
      badge: '/icon.svg',
      vibrate: [300, 150, 300, 150, 300],
      tag: tag || 'makeup-test-' + Date.now(),
      renotify: false,
      requireInteraction: true,
      data: extraData || {}
    });
    return;
  }

  // Lên lịch nhắc ca make trong tương lai - ĐẢM BẢO CHỈ 1 LẦN DUY NHẤT
  if (data.type === 'SCHEDULE_REMINDER') {
    const { delayMs, title, body, tag, data: extraData, bookingId } = data;
    if (!tag) return;

    // 1. Nếu lịch này ĐÃ THÔNG BÁO RỒI -> Tuyệt đối không thông báo lại / không spam
    if (notifiedTags.has(tag)) {
      return;
    }

    // 2. Nếu đã có hẹn giờ cũ đang chờ cho tag này -> Xóa timer cũ trước, tránh bị cộng dồn
    if (scheduledTimers.has(tag)) {
      clearTimeout(scheduledTimers.get(tag));
      scheduledTimers.delete(tag);
    }

    if (delayMs > 0) {
      const timerId = setTimeout(() => {
        scheduledTimers.delete(tag);

        // 3. Kiểm tra lần cuối: Chỉ hiển thị nếu chưa từng thông báo
        if (notifiedTags.has(tag)) {
          return;
        }
        notifiedTags.add(tag);

        self.registration.showNotification(title || '🔔 Nhắc lịch Ynii Makeup', {
          body: body || 'Đến giờ nhắc ca makeup!',
          icon: '/icon.svg',
          badge: '/icon.svg',
          vibrate: [300, 150, 300, 150, 300],
          tag: tag,
          renotify: false,
          requireInteraction: true,
          data: extraData || (bookingId ? { bookingId } : {})
        });

        // 4. Báo về cho các client đang mở để lưu vĩnh viễn vào localStorage
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
          for (const client of clients) {
            client.postMessage({ type: 'REMINDER_NOTIFIED', tag, bookingId });
          }
        });
      }, delayMs);

      scheduledTimers.set(tag, timerId);
    }
  }
});
