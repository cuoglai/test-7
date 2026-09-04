import React, { useMemo, useRef } from 'react';
import { Booking } from '../../types';
import { parseDateString, formatDateString } from '../../utils/formatters';
import { useTheme } from '../../contexts/ThemeContext';

interface MonthViewProps {
  currentDate: string;
  allBookings: Booking[];
  onSelectDay: (dateStr: string) => void;
  onMonthChange?: (dateStr: string) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  allBookings,
  onSelectDay,
  onMonthChange
}) => {
  const { isDark, accentConfig } = useTheme();
  const current = parseDateString(currentDate);
  const year = current.getFullYear();
  const month = current.getMonth(); // 0-indexed

  // Xử lý vuốt ngang để chuyển đổi giữa các tháng trước và sau
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const mouseStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0) {
        // Vuốt sang trái -> Tháng sau
        const nextMonth = new Date(year, month + 1, 1);
        onMonthChange?.(formatDateString(nextMonth));
      } else {
        // Vuốt sang phải -> Tháng trước
        const prevMonth = new Date(year, month - 1, 1);
        onMonthChange?.(formatDateString(prevMonth));
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseStartX.current === null) return;
    const deltaX = e.clientX - mouseStartX.current;
    mouseStartX.current = null;
    if (Math.abs(deltaX) > 45) {
      if (deltaX < 0) {
        const nextMonth = new Date(year, month + 1, 1);
        onMonthChange?.(formatDateString(nextMonth));
      } else {
        const prevMonth = new Date(year, month - 1, 1);
        onMonthChange?.(formatDateString(prevMonth));
      }
    }
  };

  // Generate calendar days for the current month view
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const totalDays = lastDayOfMonth.getDate();
    // In Vietnam, week starts on Monday: 0 (Sun) -> 6, 1 (Mon) -> 0
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days = [];

    // Preceding padding days from prev month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(year, month - 1, dayNum);
      days.push({
        dateStr: formatDateString(d),
        dayNum,
        isCurrentMonth: false
      });
    }

    // Days in current month
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      days.push({
        dateStr: formatDateString(d),
        dayNum: i,
        isCurrentMonth: true
      });
    }

    // Trailing padding days to fill 5 or 6 weeks (multiples of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        dateStr: formatDateString(d),
        dayNum: i,
        isCurrentMonth: false
      });
    }

    return days;
  }, [year, month]);

  // Group bookings by date string
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of allBookings) {
      if (b.status === 'cancelled') continue;
      if (!map.has(b.date)) {
        map.set(b.date, []);
      }
      map.get(b.date)!.push(b);
    }
    return map;
  }, [allBookings]);

  const weekHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const cardBg = isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-[#E5E5EA]';
  const textPrimary = isDark ? 'text-white' : 'text-[#1C1C1E]';
  const textSecondary = isDark ? 'text-[#8E8E93]' : 'text-[#8E8E93]';
  const normalCellBg = isDark ? 'bg-[#2C2C2E] border-[#38383A] hover:bg-[#38383A]' : 'bg-[#F9F9F9] border-[#E5E5EA]/60 hover:bg-[#F2F2F7]';

  return (
    <div
      id="month-view-container"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className="flex-1 overflow-y-auto ios-scrollable p-4 flex flex-col select-none cursor-grab active:cursor-grabbing"
      style={{
        paddingLeft: 'max(env(safe-area-inset-left, 0px), 16px)',
        paddingRight: 'max(env(safe-area-inset-right, 0px), 16px)',
        paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 12px) + 64px)'
      }}
    >
      {/* Month calendar card */}
      <div className={`${cardBg} rounded-2xl border p-3 sm:p-4 shadow-xs`}>
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {weekHeaders.map((header) => (
            <span
              key={header}
              className={`text-[11px] font-bold uppercase ${textSecondary} py-1`}
            >
              {header}
            </span>
          ))}
        </div>

        {/* 7-column Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {calendarGrid.map((day) => {
            const dayBookings = bookingsByDate.get(day.dateStr) || [];
            const count = dayBookings.length;
            const isSelected = day.dateStr === currentDate;

            return (
              <button
                key={day.dateStr}
                id={`month-day-cell-${day.dateStr}`}
                type="button"
                onClick={() => onSelectDay(day.dateStr)}
                style={
                  isSelected
                    ? { backgroundColor: accentConfig.lightBg, borderColor: accentConfig.hex }
                    : undefined
                }
                className={`min-h-[58px] sm:min-h-[66px] rounded-xl p-1.5 flex flex-col items-center justify-between border transition-all cursor-pointer ${
                  !day.isCurrentMonth
                    ? 'opacity-30 border-transparent bg-transparent'
                    : isSelected
                    ? 'shadow-xs'
                    : normalCellBg
                }`}
              >
                {/* Day number */}
                <span
                  style={isSelected ? { color: accentConfig.hex } : undefined}
                  className={`text-[13px] font-bold leading-none ${
                    isSelected ? '' : textPrimary
                  }`}
                >
                  {day.dayNum}
                </span>

                {/* Booking indicator dots or count */}
                {count > 0 ? (
                  <div className="flex flex-col items-center mt-1">
                    <div className="flex gap-0.5 max-w-[32px] justify-center flex-wrap">
                      {Array.from({ length: Math.min(count, 3) }).map((_, dotIdx) => (
                        <span
                          key={dotIdx}
                          style={{ backgroundColor: accentConfig.hex }}
                          className="w-1.5 h-1.5 rounded-full"
                        />
                      ))}
                    </div>
                    <span
                      style={{ color: accentConfig.hex }}
                      className="text-[9px] font-bold mt-0.5"
                    >
                      {count} lịch
                    </span>
                  </div>
                ) : (
                  <div className="h-4" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <p className={`text-center text-[12px] ${textSecondary} mt-3`}>
        Chạm vào ngày bất kỳ để xem danh sách lịch chi tiết của ngày đó.
      </p>
    </div>
  );
};
