import { Booking, BookingStatus, ReminderOption } from '../types';

export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0đ';
  return new Intl.NumberFormat('vi-VN').format(Math.max(0, amount)) + 'đ';
}

/**
 * Định dạng tiền ngắn gọn dạng 100k, 300k, 500k, 1.000k, 1.500k
 */
export function formatKCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined || amount === 0) return '0k';
  const thousands = Math.round(amount / 1000);
  return `${new Intl.NumberFormat('vi-VN').format(thousands)}k`;
}

/**
 * Định dạng doanh thu tối ưu hiển thị trong ô lịch & tóm tắt:
 * >= 1.000.000 dạng 1,2M, 2,45M, 1M
 * < 1.000.000 dạng 350k, 500k
 */
export function formatRevenueM(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined || amount === 0) return '0đ';
  if (amount >= 1_000_000) {
    const mil = amount / 1_000_000;
    const rounded = Math.round(mil * 100) / 100;
    return `${rounded.toString().replace('.', ',')}M`;
  }
  const thousands = Math.round(amount / 1000);
  return `${new Intl.NumberFormat('vi-VN').format(thousands)}k`;
}

export function formatCompactCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined || amount === 0) return '0đ';
  if (amount >= 1_000_000) {
    const mil = amount / 1_000_000;
    // e.g. 4.8M or 4M
    return `${Number.isInteger(mil) ? mil : mil.toFixed(1).replace('.', ',')}M`;
  }
  if (amount >= 1_000) {
    const k = amount / 1_000;
    return `${Number.isInteger(k) ? k : k.toFixed(1).replace('.', ',')}K`;
  }
  return formatCurrency(amount);
}

export const DAY_NAMES_VI = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy'
];

export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getVietnameseDayOfWeek(dateStr: string): string {
  const date = parseDateString(dateStr);
  return DAY_NAMES_VI[date.getDay()];
}

export const SHORT_DAYS_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function getVietnameseDateHeader(dateStr: string): {
  dayOfWeek: string;
  day: string;
  dayNum: number;
  month: string;
  monthNumber: string;
  monthNum: number;
  year: number;
  fullDateVi: string;
  collapsedDateVi: string;
  compactDateVi: string;
  formattedHeader: string;
} {
  const date = parseDateString(dateStr);
  const dayOfWeek = DAY_NAMES_VI[date.getDay()];
  const shortDay = SHORT_DAYS_VI[date.getDay()];
  const dayNum = date.getDate();
  const monthNum = date.getMonth() + 1;
  const day = String(dayNum).padStart(2, '0');
  const monthStr = String(monthNum).padStart(2, '0');
  const year = date.getFullYear();

  return {
    dayOfWeek,
    day,
    dayNum,
    month: `Tháng ${monthStr}`,
    monthNumber: monthStr,
    monthNum,
    year,
    fullDateVi: `${dayOfWeek}, ${dayNum}/${monthNum}/${year}`,
    collapsedDateVi: `${shortDay},${dayNum}/${monthNum}`,
    compactDateVi: `${dayOfWeek}, ${dayNum}/${monthNum}/${year}`,
    formattedHeader: `${dayOfWeek}, ngày ${dayNum}/${monthNum}/${year}`
  };
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return getVietnameseDateHeader(dateStr).formattedHeader;
}

export function getReminderLabel(option: ReminderOption): string {
  switch (option) {
    case 'none':
      return 'Không nhắc';
    case '15_mins':
      return '15 phút trước';
    case '30_mins':
      return '30 phút trước';
    case '1_hour':
      return '1 giờ trước';
    case '2_hours':
      return '2 giờ trước';
    case '3_hours':
      return '3 giờ trước';
    case '1_day':
      return '1 ngày trước';
    default:
      return '30 phút trước';
  }
}

export function getStatusBadgeInfo(status: BookingStatus): {
  label: string;
  badgeClass: string;
  borderClass: string;
  colorHex: string;
} {
  switch (status) {
    case 'assigned':
      return {
        label: 'Đã giao CTV',
        badgeClass: 'bg-[#F5F5FB] text-[#5856D6] border border-[#5856D6]',
        borderClass: 'border-[#5856D6]',
        colorHex: '#5856D6'
      };
    case 'completed':
    case 'paid':
      return {
        label: 'Hoàn thành',
        badgeClass: 'bg-[#F2FAF4] text-[#34C759] border border-[#34C759]',
        borderClass: 'border-[#34C759]',
        colorHex: '#34C759'
      };
    case 'cancelled':
      return {
        label: 'Đã hủy',
        badgeClass: 'bg-[#FFF2F2] text-[#FF3B30] border border-[#FF3B30]',
        borderClass: 'border-[#FF3B30]',
        colorHex: '#FF3B30'
      };
    case 'deposited':
    default:
      return {
        label: 'Đã lên lịch',
        badgeClass: 'bg-[#F2F2F7] text-[#1C1C1E] border border-[#D1D1D6]',
        borderClass: 'border-[#1C1C1E]',
        colorHex: '#1C1C1E'
      };
  }
}

/**
 * Trích xuất và chuẩn hóa số điện thoại Việt Nam từ văn bản tự do.
 * Nhận diện chính xác cả khi số bị phân tách thành cụm 3-4 số, ví dụ:
 * - 0392152562
 * - 0392 152 562, 0392.152.562, 0392-152-562
 * - 039 215 2562, 039.215.2562
 * - +84 392 152 562, +84392152562
 * - Dòng "Số điện thoại: 0392152562" hay "SĐT: 0392 152 562"
 */
export function extractVietnamesePhoneNumber(text: string): string {
  if (!text) return '';

  // 1. Thử tìm theo dòng có từ khóa SĐT / Số điện thoại / Phone / Tel
  const keywordRegex = /(?:số\s*điện\s*thoại|sđt|sdt|điện\s*thoại|phone|tel|hotline)\s*[:：\-]?\s*([0-9\s.\-+()]{9,22})/i;
  const keywordMatch = text.match(keywordRegex);
  if (keywordMatch && keywordMatch[1]) {
    const raw = keywordMatch[1];
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('84') && digits.length === 11) {
      digits = '0' + digits.slice(2);
    }
    if (digits.length === 10 && /^0[35789]/.test(digits)) {
      return digits;
    }
  }

  // 2. Tìm theo cụm số bắt đầu bằng 0 hoặc +84 với các ký tự phân tách chấm, khoảng cách, gạch nối
  // Ví dụ: 0392 152 562 hoặc 0392.152.562
  const candidateRegex = /(?:(?:\+84|0)[.\s-]?[35789](?:[.\s-]?[0-9]){8})\b/g;
  const matches = text.match(candidateRegex);
  if (matches && matches.length > 0) {
    for (const match of matches) {
      let digits = match.replace(/\D/g, '');
      if (digits.startsWith('84') && digits.length === 11) {
        digits = '0' + digits.slice(2);
      }
      if (digits.length === 10 && /^0[35789]/.test(digits)) {
        return digits;
      }
    }
  }

  // 3. Quét từng dòng tìm chuỗi số thỏa mãn 10 chữ số
  const lines = text.split('\n');
  for (const line of lines) {
    const phoneCandidates = line.match(/(?:(?:\+?84|0)[0-9\s.\-]{8,18})/g);
    if (phoneCandidates) {
      for (const cand of phoneCandidates) {
        let digits = cand.replace(/\D/g, '');
        if (digits.startsWith('84') && digits.length === 11) {
          digits = '0' + digits.slice(2);
        }
        if (digits.length === 10 && /^0[35789]/.test(digits)) {
          return digits;
        }
      }
    }
  }

  return '';
}

/**
 * Tự động phân tích các trường thông tin từ mẫu dán nhanh phổ biến của thợ make:
 * Ngày makeup: T6 ngày 11/9
 * Số lượng người: 1
 * Thời gian: 7h30
 * Địa chỉ: Số nhà 37B, ngách 53 ngõ 68 Cầu Giấy
 * Số điện thoại: 0392152562
 */
export function parseBookingTemplate(text: string): {
  phone?: string;
  time?: string;
  date?: string;
  quantity?: number;
  address?: string;
  name?: string;
} {
  const result: {
    phone?: string;
    time?: string;
    date?: string;
    quantity?: number;
    address?: string;
    name?: string;
  } = {};

  if (!text) return result;

  // 1. Số điện thoại
  const phone = extractVietnamesePhoneNumber(text);
  if (phone) result.phone = phone;

  // 2. Thời gian: 7h30, 7h, 07:30, 14:00, v.v.
  const timeMatch = text.match(/(?:thời\s*gian|giờ(?:\s*make)?)\s*[:：\-]?\s*(\d{1,2})(?:[h:](\d{1,2})?)?/i);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    if (!isNaN(hours) && hours >= 0 && hours < 24) {
      result.time = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }
  }

  // 3. Ngày makeup: T6 ngày 11/9 hoặc ngày 11/09 hoặc 11/9/2026
  const dateMatch = text.match(/(?:ngày\s*makeup|ngày\s*make|ngày)\s*[:：\-]?\s*(?:(?:T\d|thứ\s*\d|CN)\s*)?(?:ngày\s*)?(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?/i);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10);
    const yearRaw = dateMatch[3] ? parseInt(dateMatch[3], 10) : new Date().getFullYear();
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      result.date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 4. Số lượng người: 1 hoặc 2 hoặc 3
  const qtyMatch = text.match(/(?:số\s*lượng(?:\s*người)?|số\s*người)\s*[:：\-]?\s*(\d+)/i);
  if (qtyMatch) {
    const qty = parseInt(qtyMatch[1], 10);
    if (!isNaN(qty) && qty > 0) result.quantity = qty;
  }

  // 5. Địa chỉ
  const addrMatch = text.match(/(?:địa\s*chỉ|nơi\s*make|địa\s*điểm)\s*[:：\-]?\s*([^\n\r]+)/i);
  if (addrMatch && addrMatch[1]) {
    result.address = addrMatch[1].trim();
  }

  // 6. Tên khách nếu có
  const nameMatch = text.match(/(?:tên\s*khách|tên|khách(?:\s*hàng)?)\s*[:：\-]?\s*([^\n\r]+)/i);
  if (nameMatch && nameMatch[1]) {
    result.name = nameMatch[1].trim();
  }

  return result;
}

/**
 * Extract short recognizable customer/service name from "Thông tin lịch make".
 * Preserves the original verbatim content completely.
 */
export function getBookingDisplayTitle(booking: Booking): string {
  if (booking.makeupInfo && booking.makeupInfo.trim()) {
    const trimmed = booking.makeupInfo.trim();

    // Nếu có dòng "Tên khách:" hoặc "Khách:"
    const nameMatch = trimmed.match(/(?:tên\s*khách|tên|khách(?:\s*hàng)?)\s*[:：\-]\s*([^\n\r]+)/i);
    if (nameMatch && nameMatch[1].trim()) {
      return nameMatch[1].trim();
    }

    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
    const firstLine = lines[0];

    // Nếu dòng đầu là "Ngày makeup: ...", tìm địa chỉ hoặc thông tin khách thay vì hiện "Ngày makeup"
    if (/^ngày\s*makeup/i.test(firstLine)) {
      const addrMatch = trimmed.match(/địa\s*chỉ\s*[:：\-]\s*([^\n\r]+)/i);
      if (addrMatch && addrMatch[1].trim()) {
        const shortAddr = addrMatch[1].trim().split(',').slice(-2).join(',').trim();
        return `Khách – ${shortAddr || addrMatch[1].trim()}`;
      }
      return 'Lịch Makeup';
    }

    // Split by common delimiters like '–', '-', '|', ':', ','
    const parts = firstLine.split(/\s*[\u2013\u2014\-|:,]\s*/);
    if (parts.length > 0 && parts[0].trim()) {
      return parts[0].trim();
    }
    return firstLine.slice(0, 40).trim();
  }
  return booking.customerName || 'Lịch Makeup';
}

/**
 * Reconstruct or get the full "Thông tin lịch make" for viewing or editing.
 * If makeupInfo exists, returns it verbatim.
 * No pricing, deposit, or financial logic included.
 */
export function getBookingMakeupInfo(booking: Booking): string {
  if (booking.makeupInfo && booking.makeupInfo.trim()) {
    return booking.makeupInfo;
  }
  const parts: string[] = [];
  if (booking.customerName) parts.push(booking.customerName);
  if (booking.customerPhone) parts.push(booking.customerPhone);
  if (booking.customerAddress) parts.push(booking.customerAddress);
  if (booking.quantity && booking.quantity > 1) parts.push(`${booking.quantity} người`);
  if (booking.packageNameSnapshot && booking.packageNameSnapshot !== 'Makeup') {
    parts.push(booking.packageNameSnapshot);
  }

  return parts.join(' – ');
}

/**
 * Converts a "HH:mm" 24h time string to minutes from 00:00 (0 to 1439).
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Converts minutes from 00:00 to a "HH:mm" 24h formatted string.
 */
export function minutesToTime(totalMins: number): string {
  const normalized = Math.max(0, Math.min(1439, totalMins));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Validates that endTime is strictly after startTime.
 */
export function isEndTimeAfterStartTime(startTime: string, endTime: string): boolean {
  if (!startTime || !endTime) return true;
  return timeToMinutes(endTime) > timeToMinutes(startTime);
}

/**
 * Calculate default end time based on start time (+ duration in minutes, default 90 mins).
 */
export function calculateDefaultEndTime(startTime: string, durationMinutes = 90): string {
  if (!startTime) return '07:30';
  const startMins = timeToMinutes(startTime);
  const endMins = (startMins + durationMinutes) % (24 * 60);
  return minutesToTime(endMins);
}

/**
 * Calculates end time from start time and duration in minutes, handling past midnight.
 */
export function calculateEndTimeFromDuration(startTime: string, durationMinutes: number): {
  endTime: string;
  isNextDay: boolean;
  displayFormatted: string;
} {
  if (!startTime) return { endTime: '10:00', isNextDay: false, displayFormatted: '10:00' };
  const startMins = timeToMinutes(startTime);
  const totalMins = startMins + durationMinutes;
  const isNextDay = totalMins >= 1440;
  const endNormalized = totalMins % 1440;
  const endTime = minutesToTime(endNormalized);
  const displayFormatted = isNextDay ? `${endTime} (hôm sau)` : endTime;
  return { endTime, isNextDay, displayFormatted };
}

