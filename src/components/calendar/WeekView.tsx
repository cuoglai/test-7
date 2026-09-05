import React, { useMemo, useRef } from 'react';
import { Booking } from '../../types';
import { parseDateString, formatDateString } from '../../utils/formatters';
import { BookingCard } from '../booking/BookingCard';
import { findCTVConflicts } from '../../services/conflictService';
import { useTheme } from '../../contexts/ThemeContext';

interface WeekViewProps {
  currentDate: string;
  allBookings: Booking[];
  onSelectDate: (date: string) => void;
  onSelectBooking: (booking: Booking) => void;
  onOpenAddBooking: () => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  scrollProgress?: number;
}

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  allBookings,
  onSelectDate,
  onSelectBooking,
  onOpenAddBooking,
  onScroll,
  scrollProgress = 0
}) => {
  const { isDark, accentConfig } = useTheme();
  const wp = Math.min(1, Math.max(0, scrollProgress));

  // Xử lý vuốt / kéo sang tuần kế tiếp hoặc tuần trước đó
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
      const d = parseDateString(currentDate);
      if (deltaX < 0) {
        // Vuốt sang trái -> Tuần kế tiếp (+7 ngày)
        d.setDate(d.getDate() + 7);
      } else {
        // Vuốt sang phải -> Tuần trước đó (-7 ngày)
        d.setDate(d.getDate() - 7);
      }
      onSelectDate(formatDateString(d));
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
      const d = parseDateString(currentDate);
      if (deltaX < 0) {
        d.setDate(d.getDate() + 7);
      } else {
        d.setDate(d.getDate() - 7);
      }
      onSelectDate(formatDateString(d));
    }
  };

  // Compute the 7 days of the week containing currentDate (Cố định từ T2 đến CN)
  const weekDays = useMemo(() => {
    const current = parseDateString(currentDate);
    const dayOfWeek = current.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(current);
    monday.setDate(current.getDate() + diffToMonday);

    const days = [];
    const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = formatDateString(d);
      const count = allBookings.filter((b) => b.date === dateStr && b.status !== 'cancelled').length;

      days.push({
        dateStr,
        dayNum: d.getDate(),
        label: dayLabels[i],
        isCurrent: dateStr === currentDate,
        hasBookings: count > 0,
        count
      });
    }
    return days;
  }, [currentDate, allBookings]);

  // Bookings on currently selected day in this week
  const dayBookings = useMemo(() => {
    return allBookings
      .filter((b) => b.date === currentDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [allBookings, currentDate]);

  const stripBg = isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-[#E5E5EA]';
  const textPrimary = isDark ? 'text-white' : 'text-[#1C1C1E]';
  const textSecondary = isDark ? 'text-[#8E8E93]' : 'text-[#8E8E93]';
  const dayHoverBg = isDark ? 'hover:bg-[#2C2C2E]' : 'hover:bg-[#F2F2F7]';

  return (
    <div id="week-view-container" className="flex-1 flex flex-col overflow-hidden">
      {/* 7-day horizontal strip selector: hỗ trợ vuốt / kéo sang tuần kế tiếp / trước đó, tự thu gọn khung ngoài khi cuộn */}
      <div
        id="week-strip-selector"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        style={{
          paddingTop: `${Math.round(8 - wp * 4)}px`,
          paddingBottom: `${Math.round(8 - wp * 4)}px`
        }}
        className={`${stripBg} border-b px-1.5 sm:px-3 flex justify-between gap-0.5 sm:gap-1 shrink-0 select-none cursor-grab active:cursor-grabbing transition-all`}
      >
        {weekDays.map((day) => (
          <button
            key={day.dateStr}
            id={`week-day-btn-${day.dateStr}`}
            type="button"
            onClick={() => onSelectDate(day.dateStr)}
            style={{
              ...(day.isCurrent ? { backgroundColor: accentConfig.hex, color: '#FFFFFF' } : undefined),
              paddingTop: `${Math.round(6 - wp * 3.5)}px`,
              paddingBottom: `${Math.round(6 - wp * 3.5)}px`,
              borderRadius: `${Math.round(12 - wp * 4)}px`
            }}
            className={`flex-1 min-w-[38px] flex flex-col items-center transition-all cursor-pointer ${
              day.isCurrent
                ? 'shadow-xs'
                : `${dayHoverBg} ${textPrimary}`
            }`}
          >
            <span
              className={`text-[10px] font-bold uppercase tracking-wider leading-none ${
                day.isCurrent ? 'text-white/90' : textSecondary
              }`}
            >
              {day.label}
            </span>
            <span className="text-[15px] font-extrabold leading-none mt-1">{day.dayNum}</span>
            {day.hasBookings && (
              <span
                className="rounded-full shrink-0"
                style={{
                  width: `${Math.round(5 - wp * 1.5)}px`,
                  height: `${Math.round(5 - wp * 1.5)}px`,
                  marginTop: `${Math.round(3 - wp * 1.5)}px`,
                  backgroundColor: day.isCurrent ? '#FFFFFF' : accentConfig.hex
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Hourly Timeline of selected day */}
      <div
        onScroll={onScroll}
        className="flex-1 overflow-y-auto ios-scrollable p-2.5 sm:p-4"
        style={{
          WebkitOverflowScrolling: 'touch',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 10px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 12px)'
        }}
      >
        <div
          style={{
            paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 12px) + 64px)'
          }}
          className="space-y-3 min-h-[calc(100%+50px)]"
        >
          <div className="flex items-center justify-between px-1">
            <span className={`text-[11px] font-bold uppercase tracking-widest ${textSecondary}`}>
              TIMELINE THEO GIỜ · {dayBookings.length} LỊCH
            </span>
            <button
              type="button"
              onClick={onOpenAddBooking}
              style={{ color: accentConfig.hex }}
              className="text-[12px] font-bold hover:underline cursor-pointer"
            >
              + Thêm lịch
            </button>
          </div>

          {dayBookings.length === 0 ? (
            <div className="py-12 text-center">
              <p className={`text-[14px] ${textSecondary}`}>Không có lịch makeup trong ngày này</p>
              <button
                type="button"
                onClick={onOpenAddBooking}
                style={{ backgroundColor: accentConfig.hex }}
                className="mt-3 px-4 py-2 rounded-xl text-white text-[13px] font-bold shadow-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                + Tạo booking mới
              </button>
            </div>
          ) : (
            <div className={`space-y-3.5 sm:space-y-4 relative pl-2.5 before:absolute before:left-0.5 before:top-2 before:bottom-2 before:w-[2px] ${isDark ? 'before:bg-[#2C2C2E]' : 'before:bg-[#E5E5EA]'}`}>
              {dayBookings.map((booking) => {
                const conflicts = findCTVConflicts(allBookings, {
                  id: booking.id,
                  date: booking.date,
                  startTime: booking.startTime,
                  endTime: booking.endTime,
                  performerType: booking.performerType,
                  ctvId: booking.ctvId
                });

                return (
                  <div key={booking.id} className="relative z-10">
                    {/* Điểm nút trên đường timeline sát mép màn hình */}
                    <span
                      className="absolute -left-2.5 top-2.5 w-1.5 h-1.5 rounded-full ring-2 ring-white dark:ring-[#1C1C1E] shadow-2xs"
                      style={{ backgroundColor: accentConfig.hex }}
                    />
                    <BookingCard
                      booking={booking}
                      hasConflict={conflicts.length > 0}
                      onSelect={onSelectBooking}
                    />
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
