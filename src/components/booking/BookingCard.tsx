import React from 'react';
import { Booking } from '../../types';
import { getStatusInfo, getReminderLabel, formatKCurrency, formatBookingCardDate } from '../../utils/formatters';
import { Bell, AlertTriangle, Phone, User, Calendar } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface BookingCardProps {
  booking: Booking;
  hasConflict?: boolean;
  onSelect: (booking: Booking) => void;
  showDate?: boolean;
  isPast?: boolean;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  hasConflict = false,
  onSelect,
  showDate = false,
  isPast
}) => {
  const { isDark, accentConfig } = useTheme();
  const statusInfo = getStatusInfo(booking.status);
  const cardDate = showDate ? formatBookingCardDate(booking.date) : null;

  // Tự động xác định nếu ca hẹn đã qua so với ngày hôm nay
  const isPastCard = React.useMemo(() => {
    if (typeof isPast === 'boolean') return isPast;
    if (!booking.date) return false;
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return booking.date < todayStr;
  }, [isPast, booking.date]);

  // Display title: [Khách] - [Gói make]
  const displayTitle = `${booking.customerName} - ${booking.packageNameSnapshot || 'Gói Makeup'}`;

  // Information preview snippet
  const fullInfo = [
    booking.customerAddress || '',
    booking.note || ''
  ].filter(Boolean).join(' – ');

  const infoSnippet = booking.makeupInfo
    ? booking.makeupInfo.replace(/\n+/g, ' – ')
    : fullInfo;

  const isCompleted = booking.status === 'completed' || booking.status === 'paid';

  // Visual accent left border
  let borderLeftColor = 'border-l-4 ';
  if (hasConflict) {
    borderLeftColor += 'border-[#FF3B30]';
  } else if (isPastCard) {
    borderLeftColor += 'border-slate-300 dark:border-slate-700';
  } else if (isCompleted) {
    borderLeftColor += 'border-[#34C759]';
  } else if (booking.performerType === 'ctv') {
    borderLeftColor += 'border-[#5856D6]';
  } else {
    borderLeftColor += 'border-[#FF9500]';
  }

  // Thống nhất màu của bóng viền các ô thông tin:
  // Ca đã qua: viền mảnh, không đổ bóng nổi bật
  // Ca hôm nay / sắp tới: giữ nguyên màu viền và bóng nổi bật
  const borderShadowClasses = isPastCard
    ? 'border-slate-200 dark:border-slate-800 shadow-none'
    : isCompleted
      ? isDark
        ? 'border-[#34C759]/70 shadow-[0_2px_12px_rgba(52,199,89,0.22)] ring-1 ring-[#34C759]/30'
        : 'border-[#34C759] shadow-[0_2px_10px_rgba(52,199,89,0.20)] ring-1 ring-[#34C759]/35'
      : isDark
        ? 'border-[#38383A] shadow-[0_2px_8px_rgba(0,0,0,0.35)]'
        : 'border-[#D1D1D6] shadow-[0_2px_8px_rgba(0,0,0,0.06)]';

  const handlePhoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (booking.customerPhone) {
      window.location.href = `tel:${booking.customerPhone}`;
    }
  };

  const cardBg = isPastCard
    ? 'bg-slate-100/60 dark:bg-slate-900/30'
    : isDark
      ? 'bg-[#1C1C1E]'
      : 'bg-white';
  const textPrimary = isPastCard
    ? 'text-slate-500 dark:text-slate-400'
    : isDark
      ? 'text-white'
      : 'text-[#1C1C1E]';
  const textBody = isPastCard
    ? 'text-slate-400 dark:text-slate-500'
    : isDark
      ? 'text-[#D1D1D6]'
      : 'text-[#3A3A3C]';
  const textMuted = isDark ? 'text-[#8E8E93]' : 'text-[#8E8E93]';
  const btnCallBg = isPastCard
    ? 'bg-slate-200/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400'
    : isDark
      ? 'bg-[#2C2C2E] text-white'
      : 'bg-[#F2F2F7] text-[#1C1C1E]';

  return (
    <div
      id={`booking-card-${booking.id}`}
      onClick={() => onSelect(booking)}
      className={`flex items-start gap-1.5 sm:gap-2 cursor-pointer group transition-all ${
        isPastCard ? 'opacity-85 hover:opacity-100' : ''
      }`}
    >
      {/* Cột thời gian: Giờ bắt đầu / Giờ kết thúc */}
      <div className="w-10 sm:w-11 text-right pt-1.5 shrink-0 select-none">
        <p className={`text-[13px] sm:text-[13.5px] font-black ${textPrimary} leading-tight`}>{booking.startTime}</p>
        {booking.endTime && (
          <p className={`text-[10px] sm:text-[10.5px] ${isPastCard ? 'text-slate-400 dark:text-slate-600' : textMuted} leading-tight mt-0.5 font-medium`}>{booking.endTime}</p>
        )}
      </div>

      {/* Card Body: Bóng viền thống nhất (xanh lá đã hoàn thành / xám chưa hoàn thành / mờ khi đã qua) */}
      <div
        className={`flex-1 min-w-0 ${cardBg} px-3 py-2 rounded-xl border ${borderShadowClasses} ${borderLeftColor} hover:opacity-95 active:scale-[0.99] transition-all`}
      >
        {/* Hàng trên: Tiêu đề + Giá tiền + Trạng thái */}
        <div className="flex justify-between items-center gap-1.5 mb-0.5">
          <h3 className={`font-bold text-[14.5px] sm:text-[15px] ${textPrimary} leading-snug truncate`}>
            {displayTitle}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className={`text-[10.5px] font-mono px-1.5 py-0.5 rounded-md ${
                isPastCard
                  ? 'font-bold bg-slate-200/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400'
                  : 'font-black text-[#34C759] bg-[#34C759]/10'
              }`}
            >
              {formatKCurrency(booking.price || booking.totalAmount || 350000)}
            </span>
            {hasConflict && (
              <span className="flex items-center gap-0.5 text-[9px] bg-[#FFF2F2] text-[#FF3B30] px-1 py-0.5 rounded border border-[#FF3B30] font-semibold animate-pulse">
                <AlertTriangle className="w-2.5 h-2.5" />
                Trùng
              </span>
            )}
            <span
              className={`text-[9.5px] px-1.5 py-0.5 rounded-full font-semibold ${
                isPastCard
                  ? 'bg-slate-200/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-300/50 dark:border-slate-700/50'
                  : statusInfo.badgeClass
              }`}
            >
              {booking.performerType === 'ctv' && booking.status === 'assigned'
                ? `CTV ${booking.ctvNameSnapshot || 'Linh'}`
                : statusInfo.label}
            </span>
          </div>
        </div>

        {/* Thông tin ngắn / Ghi chú */}
        <p className={`text-[12px] sm:text-[12.5px] ${textBody} my-1 line-clamp-1 font-normal leading-tight`}>
          {infoSnippet}
        </p>

        {/* Metadata dưới cùng: Ngày (nếu trong tab Booking) + Người thực hiện + Nhắc nhở + Nút gọi dài ngang dễ bấm */}
        <div className={`pt-1.5 border-t ${isDark ? 'border-[#2C2C2E]' : 'border-[#F2F2F7]'} flex items-center justify-between gap-1.5 text-[11px]`}>
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Định dạng ngày CHỈ TRÊN CÁC THẺ trong tab Booking: Thứ (In đậm), Ngày & Tháng (Font thường) */}
            {cardDate && (
              <span className={`inline-flex items-center gap-1 ${textPrimary}`}>
                <Calendar className={`w-3 h-3 ${isPastCard ? 'text-slate-400 dark:text-slate-500' : 'text-[#FF9500]'}`} />
                <strong className="font-bold">{cardDate.dayOfWeek}</strong>
                <span className="font-normal">{cardDate.dayMonth}</span>
              </span>
            )}

            {/* Người make: Tôi / CTV */}
            <span className={`inline-flex items-center gap-1 font-medium ${textPrimary}`}>
              <User className={`w-3 h-3 ${isPastCard ? 'text-slate-400 dark:text-slate-500' : textMuted}`} />
              <span className={isPastCard ? 'text-slate-400 dark:text-slate-500' : textMuted}>Make:</span>
              <span
                className={
                  isPastCard
                    ? 'text-slate-500 dark:text-slate-400 font-semibold'
                    : booking.performerType === 'ctv'
                      ? 'text-[#5856D6] font-semibold'
                      : `${textPrimary} font-semibold`
                }
              >
                {booking.performerType === 'owner'
                  ? 'Tôi'
                  : `CTV ${booking.ctvNameSnapshot || ''}`}
              </span>
            </span>

            {/* Thông báo nhắc nhở */}
            <span className={`inline-flex items-center gap-1 ${isPastCard ? 'text-slate-400 dark:text-slate-500' : textMuted}`}>
              <Bell className={`w-3 h-3 ${isPastCard ? 'text-slate-400 dark:text-slate-500' : 'text-[#FF9500]'}`} />
              <span>Báo:</span>
              <span className={`${textPrimary} font-medium`}>
                {getReminderLabel(booking.reminder)}
              </span>
            </span>
          </div>

          {/* Nút gọi điện dài về chiều ngang hơn để người dùng bấm vào cực kỳ dễ dàng */}
          {booking.customerPhone && (
            <button
              id={`call-btn-${booking.id}`}
              type="button"
              onClick={handlePhoneClick}
              title={`Gọi ${booking.customerPhone}`}
              className={`h-7 px-3 rounded-full ${btnCallBg} border ${
                isPastCard
                  ? 'border-slate-300 dark:border-slate-700'
                  : isDark
                    ? 'border-[#38383A]'
                    : 'border-[#D1D1D6]'
              } flex items-center gap-1.5 hover:opacity-85 active:scale-95 transition-all cursor-pointer shrink-0 font-bold text-[11px] shadow-2xs`}
            >
              <Phone
                className="w-3.5 h-3.5"
                style={{ color: isPastCard ? undefined : accentConfig.hex }}
              />
              <span className={textPrimary}>Gọi</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
