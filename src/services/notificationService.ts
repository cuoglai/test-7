import { Booking, ReminderOption } from '../types';

let swRegistration: ServiceWorkerRegistration | null = null;
const scheduledTimerIds: number[] = [];
const notifiedBookingTags = new Set<string>();

// 1. Khởi tạo & Đăng ký Service Worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = reg;
    return reg;
  } catch (err) {
    console.warn('Service Worker registration warning:', err);
    return null;
  }
}

// 2. Kiểm tra trạng thái quyền Notification
export function getNotificationPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

// 3. Xin quyền Notification từ trình duyệt
export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      await registerServiceWorker();
    }
    return perm;
  } catch {
    return 'denied';
  }
}

// 4. Phát âm thanh chuông nhắc lịch (Web Audio API Bell Chime)
export function playNotificationChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const notes = [
      { freq: 880, start: 0, dur: 0.8 },      // A5
      { freq: 1108.73, start: 0.12, dur: 0.9 }, // C#6
      { freq: 1318.51, start: 0.24, dur: 1.2 }  // E6
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.35, now + start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + dur);
    });
  } catch (err) {
    console.warn('Could not play notification audio chime:', err);
  }
}

// 5. Rung thiết bị (Vibration API)
export function triggerDeviceVibration(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([300, 150, 300, 150, 300]);
    } catch {
      // Ignored if device does not support vibration
    }
  }
}

// 6. Hiển thị thông báo đẩy (Service Worker hoặc Notification)
export async function showBrowserNotification(
  title: string,
  body: string,
  extraData?: Record<string, unknown>
): Promise<boolean> {
  // Phát chuông và rung
  playNotificationChime();
  triggerDeviceVibration();

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const tag = 'ynii-reminder-' + Date.now();

  // Ưu tiên gửi qua Service Worker để hiển thị ngay cả khi app đang thu nhỏ / chạy ngầm
  try {
    if (!swRegistration) {
      swRegistration = await navigator.serviceWorker.getRegistration();
    }

    if (swRegistration) {
      await (swRegistration as unknown as { showNotification: (title: string, options?: unknown) => Promise<void> }).showNotification(title, {
        body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        vibrate: [300, 150, 300, 150, 300],
        tag,
        renotify: true,
        requireInteraction: true,
        data: extraData || {}
      });
      return true;
    }
  } catch (swErr) {
    console.warn('SW showNotification fallback:', swErr);
  }

  // Fallback: window Notification
  try {
    new Notification(title, {
      body,
      icon: '/icon.svg',
      tag
    });
    return true;
  } catch (e) {
    console.warn('Notification constructor error:', e);
    return false;
  }
}

// Helper đổi ReminderOption ra số phút
function getReminderMinutes(option: ReminderOption): number {
  switch (option) {
    case '15_mins':
      return 15;
    case '30_mins':
      return 30;
    case '1_hour':
      return 60;
    case '2_hours':
      return 120;
    case '1_day':
      return 1440;
    default:
      return 0;
  }
}

// 7. Đồng bộ & Lên lịch nhắc ca makeup cho các ca sắp tới
export function scheduleBookingReminders(bookings: Booking[], defaultReminder: ReminderOption): void {
  // Xóa các timer cũ
  while (scheduledTimerIds.length > 0) {
    const id = scheduledTimerIds.pop();
    if (id) clearTimeout(id);
  }

  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const now = Date.now();

  bookings.forEach((booking) => {
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return;
    }

    const reminderOption = booking.reminder || defaultReminder;
    const minutesBefore = getReminderMinutes(reminderOption);
    if (minutesBefore === 0) return;

    // Phân tích ngày giờ ca make: YYYY-MM-DD và HH:mm
    const [year, month, day] = booking.date.split('-').map(Number);
    const [hours, mins] = booking.startTime.split(':').map(Number);

    if (!year || !month || !day || isNaN(hours) || isNaN(mins)) return;

    const bookingStartTime = new Date(year, month - 1, day, hours, mins, 0).getTime();
    const reminderTargetTime = bookingStartTime - minutesBefore * 60 * 1000;

    const delayMs = reminderTargetTime - now;
    const tag = `${booking.id}_${booking.date}_${booking.startTime}`;

    // Nếu thời điểm nhắc nằm trong tương lai (tối đa trong vòng 48 tiếng) và chưa nhắc
    if (delayMs > 0 && delayMs <= 48 * 60 * 60 * 1000 && !notifiedBookingTags.has(tag)) {
      // 1. Hẹn giờ qua Service Worker (cho trường hợp app bị thu nhỏ / background)
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SCHEDULE_REMINDER',
          delayMs,
          title: `🔔 Nhắc ca makeup: ${booking.customerName}`,
          body: `Lúc ${booking.startTime} hôm nay (${booking.packageNameSnapshot || 'Makeup'}). Vui lòng chuẩn bị!`,
          tag
        });
      }

      // 2. Hẹn giờ bằng client timer
      const timerId = window.setTimeout(() => {
        notifiedBookingTags.add(tag);
        showBrowserNotification(
          `🔔 Nhắc ca makeup: ${booking.customerName}`,
          `Lúc ${booking.startTime} (${booking.packageNameSnapshot || 'Makeup'}) tại ${booking.customerAddress || 'Địa chỉ khách'}.`,
          { bookingId: booking.id }
        );
      }, delayMs);

      scheduledTimerIds.push(timerId);
    }
  });
}
