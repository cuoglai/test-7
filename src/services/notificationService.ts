import { Booking, ReminderOption } from '../types';

let swRegistration: ServiceWorkerRegistration | null = null;
const NOTIFIED_STORAGE_KEY = 'makeup_manager_notified_reminders_v1';

// Quản lý các timer đang chạy ở client để chống đặt lặp
const activeClientTimers = new Map<string, number>();
// Quản lý các tag đã gửi sang Service Worker để không postMessage liên tục mỗi lần render
const activeSwScheduledTags = new Set<string>();

// Lấy danh sách các mã ca make đã thông báo từ localStorage
export function getPersistedNotifiedTags(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(NOTIFIED_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {
    console.warn('Error reading notified tags:', e);
  }
  return new Set();
}

// Kiểm tra ca make đã từng thông báo chưa
export function isBookingNotified(tag: string): boolean {
  return getPersistedNotifiedTags().has(tag);
}

// Đánh dấu ca make đã thông báo để không bao giờ thông báo lại
export function markBookingAsNotified(tag: string): void {
  if (typeof window === 'undefined') return;
  try {
    const tags = getPersistedNotifiedTags();
    if (tags.has(tag)) return;
    tags.add(tag);
    // Giữ tối đa 500 tags gần nhất để tránh tốn bộ nhớ
    const arr = Array.from(tags).slice(-500);
    localStorage.setItem(NOTIFIED_STORAGE_KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn('Error saving notified tag:', e);
  }
}

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
  const tag = (extraData?.tag as string) || (extraData?.bookingId
    ? `booking-reminder-${extraData.bookingId}`
    : 'ynii-single-reminder');

  // Nếu là thông báo lịch thực tế (có tag) và đã thông báo rồi -> bỏ qua không spam
  if (extraData?.tag && isBookingNotified(extraData.tag as string)) {
    return false;
  }

  // Phát chuông và rung
  playNotificationChime();
  triggerDeviceVibration();

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

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
        renotify: false, // TẮT renotify để không re-alert spam
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
    const notif = new Notification(title, {
      body,
      icon: '/icon.svg',
      tag,
      data: extraData || {}
    });
    notif.onclick = () => {
      window.focus();
      if (extraData?.bookingId) {
        window.dispatchEvent(
          new CustomEvent('open-booking-detail', {
            detail: { bookingId: extraData.bookingId }
          })
        );
      }
    };
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

// 7. Đồng bộ & Lên lịch nhắc ca makeup cho các ca sắp tới - ĐẢM BẢO DUY NHẤT 1 LẦN, KHÔNG SPAM
export function scheduleBookingReminders(bookings: Booking[], defaultReminder: ReminderOption): void {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  // Đồng bộ danh sách đã thông báo sang Service Worker
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SYNC_NOTIFIED_TAGS',
      tags: Array.from(getPersistedNotifiedTags())
    });
  }

  const now = Date.now();
  const validCurrentTags = new Set<string>();

  bookings.forEach((booking) => {
    const tag = `booking-reminder-${booking.id}-${booking.date}-${booking.startTime}`;

    // Nếu ca make bị hủy hoặc đã hoàn thành -> Không thông báo, hủy hẹn giờ nếu có
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      if (activeClientTimers.has(tag)) {
        clearTimeout(activeClientTimers.get(tag));
        activeClientTimers.delete(tag);
      }
      if (activeSwScheduledTags.has(tag)) {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'CANCEL_REMINDER', tag });
        }
        activeSwScheduledTags.delete(tag);
      }
      return;
    }

    // 1. Nếu ca make này ĐÃ THÔNG BÁO RỒI -> Bỏ qua ngay lập tức, không thông báo lại
    if (isBookingNotified(tag)) {
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

    // Nếu thời điểm nhắc đã trôi qua trong quá khứ -> đánh dấu đã qua để không bao giờ nhắc trễ
    if (delayMs <= 0) {
      markBookingAsNotified(tag);
      return;
    }

    // Nếu thời điểm nhắc nằm trong tương lai (tối đa trong vòng 48 tiếng)
    if (delayMs > 0 && delayMs <= 48 * 60 * 60 * 1000) {
      validCurrentTags.add(tag);

      // Trường hợp 1: Có Service Worker đang chạy -> Giao toàn bộ việc hẹn giờ cho SW
      // Chỉ gửi postMessage 1 lần duy nhất cho mỗi ca make, không spam gửi lại mỗi render
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        if (!activeSwScheduledTags.has(tag)) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SCHEDULE_REMINDER',
            delayMs,
            title: `🔔 Nhắc ca makeup: ${booking.customerName}`,
            body: `Lúc ${booking.startTime} hôm nay (${booking.packageNameSnapshot || 'Makeup'}). Vui lòng chuẩn bị!`,
            tag,
            bookingId: booking.id
          });
          activeSwScheduledTags.add(tag);
        }
      } else {
        // Trường hợp 2: Chưa có SW -> Dùng client timer fallback (chỉ 1 timer duy nhất per tag)
        if (!activeClientTimers.has(tag)) {
          const timerId = window.setTimeout(() => {
            activeClientTimers.delete(tag);
            if (!isBookingNotified(tag)) {
              markBookingAsNotified(tag);
              showBrowserNotification(
                `🔔 Nhắc ca makeup: ${booking.customerName}`,
                `Lúc ${booking.startTime} (${booking.packageNameSnapshot || 'Makeup'}) tại ${booking.customerAddress || 'Địa chỉ khách'}.`,
                { bookingId: booking.id, tag }
              );
            }
          }, delayMs);

          activeClientTimers.set(tag, timerId);
        }
      }
    }
  });

  // Dọn dẹp các timer mồ côi (khi người dùng xóa ca make hoặc đổi ngày giờ)
  for (const [tag, timerId] of activeClientTimers.entries()) {
    if (!validCurrentTags.has(tag)) {
      clearTimeout(timerId);
      activeClientTimers.delete(tag);
    }
  }
  for (const tag of activeSwScheduledTags) {
    if (!validCurrentTags.has(tag)) {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CANCEL_REMINDER', tag });
      }
      activeSwScheduledTags.delete(tag);
    }
  }
}

