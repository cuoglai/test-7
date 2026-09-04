import React, { useState, useMemo } from 'react';
import { Booking } from '../../types';
import { formatKCurrency, formatRevenueM, formatCurrency, getBookingDisplayTitle } from '../../utils/formatters';
import { useTheme } from '../../contexts/ThemeContext';
import { ChevronLeft, ChevronRight, TrendingUp, Calendar, User, Clock, ArrowRight } from 'lucide-react';

interface RevenueViewProps {
  bookings: Booking[];
  currentDate: string;
  onSelectBooking: (booking: Booking) => void;
  onOpenAddBooking: () => void;
}

type RevenueFilter = 'all' | 'owner' | 'ctv';

export const getBookingRevenue = (b: Booking): number => {
  if (typeof b.price === 'number' && b.price > 0) return b.price;
  if (typeof b.totalAmount === 'number' && b.totalAmount > 0) return b.totalAmount;
  if (typeof b.packagePrice === 'number' && b.packagePrice > 0) return b.packagePrice;
  return 350000;
};

const WEEKDAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const RevenueView: React.FC<RevenueViewProps> = ({
  bookings,
  currentDate,
  onSelectBooking,
  onOpenAddBooking
}) => {
  const { isDark, accentConfig } = useTheme();

  // Parse initial anchor date
  const [initialYear, initialMonth, initialDay] = useMemo(() => {
    const parts = (currentDate || '2026-09-04').split('-').map(Number);
    return [parts[0] || 2026, parts[1] || 9, parts[2] || 4];
  }, [currentDate]);

  // Year & Month state
  const [year, setYear] = useState<number>(initialYear);
  const [month, setMonth] = useState<number>(initialMonth);

  // Selected date state (default to today or initialDate)
  const [selectedDate, setSelectedDate] = useState<string>(currentDate);

  // Filter: Tất cả / Tôi / CTV
  const [filter, setFilter] = useState<RevenueFilter>('all');

  // Month navigation
  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    const dStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setSelectedDate(dStr);
  };

  // Filtered bookings: Chỉ các ca đã tích hoàn thành mới hiển thị trong doanh thu
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // QUAN TRỌNG: Chỉ các ca đã tích hoàn thành mới tính vào doanh thu
      if (b.status !== 'completed') return false;
      if (filter === 'owner') return b.performerType === 'owner';
      if (filter === 'ctv') return b.performerType === 'ctv';
      return true;
    });
  }, [bookings, filter]);

  // Month stats
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const monthBookings = useMemo(() => {
    return filteredBookings.filter((b) => b.date && b.date.startsWith(monthPrefix));
  }, [filteredBookings, monthPrefix]);

  const totalMonthRevenue = useMemo(() => {
    return monthBookings.reduce((sum, b) => sum + getBookingRevenue(b), 0);
  }, [monthBookings]);

  const totalMonthBookingsCount = monthBookings.length;

  // Days in month calculation
  const daysInMonth = useMemo(() => {
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  const firstDayOffset = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    // Monday = 0, Sunday = 6
    return (firstDay + 6) % 7;
  }, [year, month]);

  // Selected day bookings
  const selectedDayBookings = useMemo(() => {
    if (!selectedDate) return [];
    return filteredBookings
      .filter((b) => b.date === selectedDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [filteredBookings, selectedDate]);

  const selectedDayRevenue = useMemo(() => {
    return selectedDayBookings.reduce((sum, b) => sum + getBookingRevenue(b), 0);
  }, [selectedDayBookings]);

  // Formatted date label for selected day: DD/MM
  const selectedDayFormattedLabel = useMemo(() => {
    if (!selectedDate) return '';
    const parts = selectedDate.split('-');
    if (parts.length < 3) return selectedDate;
    return `${parts[2]}/${parts[1]}`;
  }, [selectedDate]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Theme styles
  const viewBg = isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]';
  const cardBg = isDark ? 'bg-[#1C1C1E]' : 'bg-white';
  const cardBorder = isDark ? 'border-[#2C2C2E]' : 'border-[#E5E5EA]';
  const textPrimary = isDark ? 'text-white' : 'text-[#1C1C1E]';
  const textSecondary = isDark ? 'text-[#8E8E93]' : 'text-[#636366]';
  const inputBg = isDark ? 'bg-[#2C2C2E]' : 'bg-[#F2F2F7]';

  return (
    <div id="revenue-view-root" className={`flex-1 flex flex-col overflow-hidden ${viewBg}`}>
      {/* Top Header */}
      <div
        className={`${cardBg} border-b ${cardBorder} shrink-0 select-none`}
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
          paddingBottom: '12px',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 16px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 16px)'
        }}
      >
        {/* Header Title & Month Switcher */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className={`text-xl font-black ${textPrimary} tracking-tight flex items-center gap-1.5`}>
              <TrendingUp className="w-5 h-5" style={{ color: accentConfig.hex }} />
              Doanh thu
            </h2>
            <p className={`text-[12px] font-medium ${textSecondary}`}>
              Tháng {String(month).padStart(2, '0')}/{year}
            </p>
          </div>

          {/* Month Stepper */}
          <div className="flex items-center gap-1">
            <button
              id="revenue-prev-month-btn"
              type="button"
              onClick={handlePrevMonth}
              title="Tháng trước"
              className={`w-8 h-8 rounded-full ${inputBg} flex items-center justify-center ${textPrimary} hover:opacity-80 active:scale-95 transition-all cursor-pointer border ${cardBorder}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleCurrentMonth}
              title="Về tháng hiện tại"
              className={`text-[12px] font-bold px-2.5 h-8 rounded-full ${inputBg} ${textPrimary} hover:opacity-80 active:scale-95 transition-all cursor-pointer border ${cardBorder}`}
            >
              T{month}
            </button>

            <button
              id="revenue-next-month-btn"
              type="button"
              onClick={handleNextMonth}
              title="Tháng sau"
              className={`w-8 h-8 rounded-full ${inputBg} flex items-center justify-center ${textPrimary} hover:opacity-80 active:scale-95 transition-all cursor-pointer border ${cardBorder}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Month Summary Bar: Chỉ hiện chữ Tổng, số tiền đầy đủ ví dụ 9.500.000đ, phần tổng ca giữ nguyên */}
        <div className={`mt-2.5 px-3.5 py-2 rounded-xl ${inputBg} border ${cardBorder} flex items-center justify-between`}>
          <div className="flex items-baseline gap-2 min-w-0">
            <span className={`text-[12px] font-bold uppercase tracking-wider ${textSecondary} shrink-0`}>
              Tổng:
            </span>
            <span className="text-[16px] sm:text-[18px] font-black text-[#34C759] tracking-tight font-mono truncate">
              {formatCurrency(totalMonthRevenue)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <span className={`text-[11px] font-medium ${textSecondary}`}>Tổng:</span>
            <span className={`text-[12px] font-bold ${textPrimary} font-mono px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5`}>
              {totalMonthBookingsCount} ca
            </span>
          </div>
        </div>

        {/* Filter Segmented Control: Tất cả | Tôi | CTV */}
        <div className="mt-2 p-0.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 grid grid-cols-3 gap-1">
          <button
            id="revenue-filter-all"
            type="button"
            onClick={() => setFilter('all')}
            style={
              filter === 'all'
                ? { backgroundColor: accentConfig.hex, color: '#FFFFFF' }
                : undefined
            }
            className={`py-1 rounded-lg text-[12px] font-bold transition-all cursor-pointer text-center ${
              filter === 'all'
                ? 'shadow-xs'
                : `${textSecondary} hover:${textPrimary}`
            }`}
          >
            Tất cả
          </button>

          <button
            id="revenue-filter-owner"
            type="button"
            onClick={() => setFilter('owner')}
            style={
              filter === 'owner'
                ? { backgroundColor: accentConfig.hex, color: '#FFFFFF' }
                : undefined
            }
            className={`py-1 rounded-lg text-[12px] font-bold transition-all cursor-pointer text-center ${
              filter === 'owner'
                ? 'shadow-xs'
                : `${textSecondary} hover:${textPrimary}`
            }`}
          >
            Tôi
          </button>

          <button
            id="revenue-filter-ctv"
            type="button"
            onClick={() => setFilter('ctv')}
            style={
              filter === 'ctv'
                ? { backgroundColor: accentConfig.hex, color: '#FFFFFF' }
                : undefined
            }
            className={`py-1 rounded-lg text-[12px] font-bold transition-all cursor-pointer text-center ${
              filter === 'ctv'
                ? 'shadow-xs'
                : `${textSecondary} hover:${textPrimary}`
            }`}
          >
            CTV
          </button>
        </div>
      </div>

      {/* Main Scrollable Area */}
      <div
        className="flex-1 overflow-y-auto ios-scrollable p-3 sm:p-4 space-y-4"
        style={{
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 12px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 12px)',
          paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 12px) + 64px)'
        }}
      >
        {/* ============================================================ */}
        {/* LỊCH THÁNG TRỌN VẸN (Ô HÌNH VUÔNG, DẤU CHẤM XANH & TIỀN GỌN) */}
        {/* ============================================================ */}
        <div className={`${cardBg} p-2.5 sm:p-3 rounded-2xl border ${cardBorder} shadow-xs`}>
          {/* Weekday headers: T2, T3, T4, T5, T6, T7, CN */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {WEEKDAY_NAMES.map((w, idx) => (
              <div
                key={w}
                className={`text-[11px] font-bold py-1 ${
                  idx >= 5 ? 'text-[#FF9500]' : textSecondary
                }`}
              >
                {w}
              </div>
            ))}
          </div>

          {/* Days Grid: 7 columns (Hình vuông aspect-square) */}
          <div className="grid grid-cols-7 gap-1">
            {/* Offset empty slots */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square rounded-xl opacity-0 pointer-events-none" />
            ))}

            {/* Month days: 1 .. daysInMonth */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = selectedDate === dateStr;
              const isToday = todayStr === dateStr;

              // Day bookings (chỉ các ca đã tích hoàn thành)
              const dayBookings = filteredBookings.filter((b) => b.date === dateStr);
              const dayCount = dayBookings.length;
              const dayRev = dayBookings.reduce((sum, b) => sum + getBookingRevenue(b), 0);
              const hasBookings = dayCount > 0;

              // Styling ô ngày: highlight màu xanh blue nhạt lên cả ô cho ngày hôm nay
              let cellBg = 'bg-transparent';
              let cellBorder = 'border-transparent';

              if (isToday) {
                // Highlight màu xanh blue nhạt lên cả ô
                cellBg = isDark ? 'bg-[#007AFF]/20' : 'bg-[#007AFF]/10';
                cellBorder = isSelected
                  ? 'border-2 border-[#007AFF] shadow-xs'
                  : 'border border-[#007AFF]/35';
              } else if (isSelected) {
                cellBg = isDark ? 'bg-[#2C2C2E]' : 'bg-[#F2F2F7]';
                cellBorder = 'border-2 border-[#007AFF] shadow-xs';
              } else if (hasBookings) {
                cellBg = inputBg;
                cellBorder = `${cardBorder} border hover:opacity-90 active:scale-95`;
              } else {
                cellBg = 'bg-transparent hover:opacity-80 active:scale-95';
                cellBorder = 'border border-transparent';
              }

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(dateStr)}
                  className={`aspect-square p-1 rounded-xl flex flex-col justify-between items-center transition-all cursor-pointer text-center relative overflow-hidden ${cellBg} ${cellBorder}`}
                >
                  {/* Hàng 1 (Trên): Số ngày (Không vẽ vòng tròn, tô màu chữ nổi bật) */}
                  <div className="w-full flex items-center justify-center pt-0.5 leading-none shrink-0">
                    <span
                      className={`text-[11px] sm:text-[12px] leading-none ${
                        isToday
                          ? 'font-black'
                          : isSelected
                          ? `font-bold ${textPrimary}`
                          : hasBookings
                          ? `font-bold ${textPrimary}`
                          : `font-medium ${textSecondary}`
                      }`}
                      style={isToday ? { color: accentConfig.hex } : undefined}
                    >
                      {dayNum}
                    </span>
                  </div>

                  {/* Hàng 2 (Giữa): Dấu chấm xanh ca make - nhỏ lại để hiển thị được lên tới 6 dấu chấm */}
                  <div className="w-full flex items-center justify-center min-h-[6px] my-auto">
                    {hasBookings ? (
                      <div className="flex items-center justify-center gap-[1.5px] max-w-full">
                        {Array.from({ length: Math.min(dayCount, 6) }).map((_, dotIdx) => (
                          <span
                            key={dotIdx}
                            className="w-1 h-1 rounded-full bg-[#34C759] shrink-0"
                          />
                        ))}
                        {dayCount > 6 && (
                          <span className="text-[7px] font-black text-[#34C759] leading-none ml-0.5">+</span>
                        )}
                      </div>
                    ) : (
                      <span className="w-1 h-1 opacity-0 pointer-events-none" />
                    )}
                  </div>

                  {/* Hàng 3 (Dưới): Số tiền căn ở đáy ô (dạng 1,2M, 2,45M, 350k không bị tràn) */}
                  <div className="w-full flex items-center justify-center pb-0.5 leading-none shrink-0">
                    {hasBookings ? (
                      <span className="text-[9px] sm:text-[10px] font-extrabold text-[#34C759] leading-none block font-mono tracking-tight w-full truncate text-center">
                        {formatRevenueM(dayRev)}
                      </span>
                    ) : (
                      <span className="text-[9px] leading-none opacity-0 select-none pointer-events-none">0</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================ */}
        {/* DOANH THU THEO NGÀY ĐƯỢC CHỌN                                */}
        {/* ============================================================ */}
        <div className={`${cardBg} p-4 rounded-2xl border ${cardBorder} shadow-xs space-y-3`}>
          {/* Header Banner: Luôn ở phía trên danh sách */}
          <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: isDark ? '#2C2C2E' : '#F2F2F7' }}>
            <div>
              <span className={`text-[11px] font-extrabold uppercase tracking-wider ${textSecondary} block`}>
                DOANH THU NGÀY {selectedDayFormattedLabel}
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-[22px] font-black text-[#34C759] tracking-tight font-mono">
                  {formatRevenueM(selectedDayRevenue)}
                </span>
                {selectedDayRevenue >= 1_000_000 && (
                  <span className="text-[12px] font-semibold text-[#34C759]">
                    ({formatCurrency(selectedDayRevenue)})
                  </span>
                )}
                <span className={`text-[14px] font-bold ${textSecondary}`}>
                  · {selectedDayBookings.length} ca
                </span>
              </div>
            </div>

            {selectedDayBookings.length > 0 && (
              <span
                className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: accentConfig.lightBg, color: accentConfig.hex }}
              >
                {filter === 'all' ? 'Tất cả' : filter === 'owner' ? 'Tôi' : 'CTV'}
              </span>
            )}
          </div>

          {/* List of bookings for the selected day */}
          {selectedDayBookings.length === 0 ? (
            <div className="py-6 text-center">
              <Calendar className={`w-8 h-8 ${textSecondary} mx-auto mb-2 opacity-40`} />
              <p className={`text-[13px] font-medium ${textSecondary}`}>
                Chưa có ca makeup nào hoàn thành trong ngày {selectedDayFormattedLabel}
              </p>
              <button
                type="button"
                onClick={onOpenAddBooking}
                style={{ color: accentConfig.hex }}
                className="text-[12px] font-bold mt-2 hover:underline cursor-pointer"
              >
                + Thêm lịch cho ngày này
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {selectedDayBookings.map((b) => {
                const bRev = getBookingRevenue(b);
                const title = getBookingDisplayTitle(b);

                return (
                  <div
                    key={b.id}
                    onClick={() => onSelectBooking(b)}
                    className={`p-3 rounded-xl border ${cardBorder} ${inputBg} hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-3`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      {/* Customer Title */}
                      <p className={`text-[14px] font-bold ${textPrimary} truncate leading-tight`}>
                        {title}
                      </p>

                      {/* Time */}
                      <div className={`flex items-center gap-1.5 text-[12px] font-medium ${textSecondary}`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {b.startTime} {b.endTime ? `– ${b.endTime}` : ''}
                        </span>
                      </div>

                      {/* Performer */}
                      <div className="flex items-center gap-1.5 text-[12px]">
                        <User className="w-3.5 h-3.5 text-[#8E8E93]" />
                        <span className={textSecondary}>Người make:</span>
                        <span
                          className={`font-semibold ${
                            b.performerType === 'ctv' ? 'text-[#5856D6]' : textPrimary
                          }`}
                        >
                          {b.performerType === 'owner'
                            ? 'Tôi'
                            : `CTV ${b.ctvNameSnapshot || ''}`}
                        </span>
                      </div>
                    </div>

                    {/* Price and Action Arrow */}
                    <div className="text-right shrink-0">
                      <span className="text-[16px] font-black text-[#34C759] font-mono block">
                        {formatKCurrency(bRev)}
                      </span>
                      <span className={`text-[11px] ${textSecondary} flex items-center justify-end gap-0.5 mt-1 hover:underline`}>
                        Chi tiết <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
