import React, { useMemo, useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
}

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  allBookings,
  onSelectDate,
  onSelectBooking,
  onOpenAddBooking,
  onScroll
}) => {
  const { isDark, accentConfig } = useTheme();

  // Hướng chuyển động khi chuyển ngày: 1 (sang phải -> ngày tiếp theo), -1 (sang trái -> ngày trước đó)
  const [direction, setDirection] = useState<number>(0);
  const prevDateRef = useRef(currentDate);

  useEffect(() => {
    if (currentDate > prevDateRef.current) {
      setDirection(1);
    } else if (currentDate < prevDateRef.current) {
      setDirection(-1);
    }
    prevDateRef.current = currentDate;
  }, [currentDate]);

  const goToNextDay = () => {
    const d = parseDateString(currentDate);
    d.setDate(d.getDate() + 1);
    setDirection(1);
    onSelectDate(formatDateString(d));
  };

  const goToPrevDay = () => {
    const d = parseDateString(currentDate);
    d.setDate(d.getDate() - 1);
    setDirection(-1);
    onSelectDate(formatDateString(d));
  };

  // 1. Xử lý vuốt trên thanh chọn tuần (Strip selector) -> chuyển cả tuần (+/- 7 ngày)
  const stripTouchStartX = useRef<number | null>(null);
  const stripTouchStartY = useRef<number | null>(null);
  const stripMouseStartX = useRef<number | null>(null);

  const handleStripTouchStart = (e: React.TouchEvent) => {
    stripTouchStartX.current = e.touches[0].clientX;
    stripTouchStartY.current = e.touches[0].clientY;
  };

  const handleStripTouchEnd = (e: React.TouchEvent) => {
    if (stripTouchStartX.current === null || stripTouchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - stripTouchStartX.current;
    const deltaY = e.changedTouches[0].clientY - stripTouchStartY.current;
    stripTouchStartX.current = null;
    stripTouchStartY.current = null;

    if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      const d = parseDateString(currentDate);
      if (deltaX < 0) {
        d.setDate(d.getDate() + 7);
        setDirection(1);
      } else {
        d.setDate(d.getDate() - 7);
        setDirection(-1);
      }
      onSelectDate(formatDateString(d));
    }
  };

  const handleStripMouseDown = (e: React.MouseEvent) => {
    stripMouseStartX.current = e.clientX;
  };

  const handleStripMouseUp = (e: React.MouseEvent) => {
    if (stripMouseStartX.current === null) return;
    const deltaX = e.clientX - stripMouseStartX.current;
    stripMouseStartX.current = null;
    if (Math.abs(deltaX) > 45) {
      const d = parseDateString(currentDate);
      if (deltaX < 0) {
        d.setDate(d.getDate() + 7);
        setDirection(1);
      } else {
        d.setDate(d.getDate() - 7);
        setDirection(-1);
      }
      onSelectDate(formatDateString(d));
    }
  };

  // 2. Xử lý vuốt trong VÙNG TIMELINE CÁC THẺ LỊCH -> chuyển từng ngày tiếp theo / trước đó
  const timelineTouchStartX = useRef<number | null>(null);
  const timelineTouchStartY = useRef<number | null>(null);
  const timelineTouchStartTime = useRef<number>(0);
  const timelineMouseStartX = useRef<number | null>(null);
  const timelineMouseStartY = useRef<number | null>(null);

  const handleTimelineTouchStart = (e: React.TouchEvent) => {
    timelineTouchStartX.current = e.touches[0].clientX;
    timelineTouchStartY.current = e.touches[0].clientY;
    timelineTouchStartTime.current = Date.now();
  };

  const handleTimelineTouchEnd = (e: React.TouchEvent) => {
    if (timelineTouchStartX.current === null || timelineTouchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - timelineTouchStartX.current;
    const deltaY = e.changedTouches[0].clientY - timelineTouchStartY.current;
    const deltaTime = Date.now() - timelineTouchStartTime.current;
    timelineTouchStartX.current = null;
    timelineTouchStartY.current = null;

    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
    const isSufficient = Math.abs(deltaX) >= 40 || (Math.abs(deltaX) >= 25 && deltaTime < 300);

    if (isHorizontal && isSufficient) {
      if (deltaX < 0) {
        // Vuốt sang trái -> Ngày tiếp theo (+1 ngày)
        goToNextDay();
      } else {
        // Vuốt sang phải -> Ngày trước đó (-1 ngày)
        goToPrevDay();
      }
    }
  };

  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    timelineMouseStartX.current = e.clientX;
    timelineMouseStartY.current = e.clientY;
  };

  const handleTimelineMouseUp = (e: React.MouseEvent) => {
    if (timelineMouseStartX.current === null || timelineMouseStartY.current === null) return;
    const deltaX = e.clientX - timelineMouseStartX.current;
    const deltaY = e.clientY - timelineMouseStartY.current;
    timelineMouseStartX.current = null;
    timelineMouseStartY.current = null;

    if (Math.abs(deltaX) >= 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0) {
        goToNextDay();
      } else {
        goToPrevDay();
      }
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
    <div id="week-view-container" className="flex-1 flex flex-col overflow-hidden select-none">
      {/* 7-day horizontal strip selector: hỗ trợ vuốt / kéo sang tuần kế tiếp / trước đó */}
      <div
        id="week-strip-selector"
        onTouchStart={handleStripTouchStart}
        onTouchEnd={handleStripTouchEnd}
        onMouseDown={handleStripMouseDown}
        onMouseUp={handleStripMouseUp}
        className={`${stripBg} border-b px-1.5 sm:px-3 py-1.5 flex justify-between gap-0.5 sm:gap-1 shrink-0 select-none cursor-grab active:cursor-grabbing transition-all`}
      >
        {weekDays.map((day) => (
          <button
            key={day.dateStr}
            id={`week-day-btn-${day.dateStr}`}
            type="button"
            onClick={() => onSelectDate(day.dateStr)}
            style={{
              ...(day.isCurrent ? { backgroundColor: accentConfig.hex, color: '#FFFFFF' } : undefined),
              borderRadius: '10px'
            }}
            className={`flex-1 min-w-[38px] py-1 flex flex-col items-center transition-all cursor-pointer ${
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
            <span className="text-[14px] font-extrabold leading-none mt-1">{day.dayNum}</span>
            {day.hasBookings && (
              <span
                className="w-1.2 h-1.2 rounded-full shrink-0 mt-0.5"
                style={{
                  backgroundColor: day.isCurrent ? '#FFFFFF' : accentConfig.hex
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Hourly Timeline of selected day: Hỗ trợ vuốt chuyển ngày mượt mà */}
      <div
        id="week-timeline-container"
        onScroll={onScroll}
        onTouchStart={handleTimelineTouchStart}
        onTouchEnd={handleTimelineTouchEnd}
        onMouseDown={handleTimelineMouseDown}
        onMouseUp={handleTimelineMouseUp}
        className="flex-1 overflow-y-auto overflow-x-hidden ios-scrollable p-2.5 sm:p-4 select-none"
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 10px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 12px)'
        }}
      >
        <motion.div
          key={currentDate}
          initial={{ x: direction > 0 ? 36 : direction < 0 ? -36 : 0, opacity: 0.85 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{
            x: { type: 'spring', stiffness: 500, damping: 38, mass: 0.8 },
            opacity: { duration: 0.12, ease: 'easeOut' }
          }}
          className="space-y-3 min-h-[calc(100%+50px)]"
          style={{
            paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 12px) + 64px)'
          }}
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
          </motion.div>
      </div>
    </div>
  );
};

