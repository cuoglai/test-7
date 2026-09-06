import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Booking } from '../../types';
import { BookingCard } from '../booking/BookingCard';
import { findCTVConflicts } from '../../services/conflictService';
import { Plus, CalendarX } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { parseDateString, formatDateString } from '../../utils/formatters';

interface DayViewProps {
  date: string;
  isToday: boolean;
  bookings: Booking[];
  allBookings: Booking[];
  onSelectBooking: (booking: Booking) => void;
  onOpenAddBooking: () => void;
  onSelectDate?: (date: string) => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

const timelineSlideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : direction < 0 ? -60 : 0,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: 'spring', stiffness: 350, damping: 30 },
      opacity: { duration: 0.18, ease: 'easeOut' }
    }
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : direction < 0 ? 60 : 0,
    opacity: 0,
    transition: {
      x: { type: 'spring', stiffness: 350, damping: 30 },
      opacity: { duration: 0.14, ease: 'easeIn' }
    }
  })
};

export const DayView: React.FC<DayViewProps> = ({
  date,
  isToday,
  bookings,
  allBookings,
  onSelectBooking,
  onOpenAddBooking,
  onSelectDate,
  onScroll
}) => {
  const { isDark, accentConfig } = useTheme();
  const sortedBookings = [...bookings].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const textPrimary = isDark ? 'text-white' : 'text-[#1C1C1E]';
  const textSecondary = isDark ? 'text-[#8E8E93]' : 'text-[#8E8E93]';
  const emptyIconBg = isDark ? 'bg-[#1C1C1E]' : 'bg-[#E5E5EA]/70';

  // Hướng chuyển động: 1 (sang phải -> ngày tiếp theo), -1 (sang trái -> ngày trước đó)
  const [direction, setDirection] = useState<number>(0);
  const prevDateRef = useRef(date);

  useEffect(() => {
    if (date > prevDateRef.current) {
      setDirection(1);
    } else if (date < prevDateRef.current) {
      setDirection(-1);
    }
    prevDateRef.current = date;
  }, [date]);

  // Điều hướng ngày khi vuốt
  const goToNextDay = () => {
    if (!onSelectDate) return;
    const d = parseDateString(date);
    d.setDate(d.getDate() + 1);
    setDirection(1);
    onSelectDate(formatDateString(d));
  };

  const goToPrevDay = () => {
    if (!onSelectDate) return;
    const d = parseDateString(date);
    d.setDate(d.getDate() - 1);
    setDirection(-1);
    onSelectDate(formatDateString(d));
  };

  // Cử chỉ chạm vuốt (Touch Swipe) & Kéo chuột (Mouse Drag)
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const mouseStartX = useRef<number | null>(null);
  const mouseStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    const deltaTime = Date.now() - touchStartTime.current;
    touchStartX.current = null;
    touchStartY.current = null;

    // Ưu tiên vuốt ngang rõ rệt so với cuộn dọc
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
    const isSufficient = Math.abs(deltaX) >= 40 || (Math.abs(deltaX) >= 25 && deltaTime < 300);

    if (isHorizontal && isSufficient) {
      if (deltaX < 0) {
        // Vuốt sang trái -> Ngày tiếp theo
        goToNextDay();
      } else {
        // Vuốt sang phải -> Ngày trước đó
        goToPrevDay();
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    mouseStartX.current = e.clientX;
    mouseStartY.current = e.clientY;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseStartX.current === null || mouseStartY.current === null) return;
    const deltaX = e.clientX - mouseStartX.current;
    const deltaY = e.clientY - mouseStartY.current;
    mouseStartX.current = null;
    mouseStartY.current = null;

    if (Math.abs(deltaX) >= 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0) {
        goToNextDay();
      } else {
        goToPrevDay();
      }
    }
  };

  return (
    <div
      id="day-view-container"
      onScroll={onScroll}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className="flex-1 overflow-y-auto overflow-x-hidden ios-scrollable pt-2 select-none"
      style={{
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        paddingLeft: 'max(env(safe-area-inset-left, 0px), 10px)',
        paddingRight: 'max(env(safe-area-inset-right, 0px), 12px)'
      }}
    >
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={date}
          custom={direction}
          variants={timelineSlideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="space-y-3 min-h-[calc(100%+50px)]"
          style={{
            paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 12px) + 64px)'
          }}
        >
          {sortedBookings.length === 0 ? (
            <div
              id="day-view-empty-state"
              className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center"
            >
              <div className={`w-16 h-16 rounded-full ${emptyIconBg} flex items-center justify-center mb-3`}>
                <CalendarX className={`w-8 h-8 ${textSecondary}`} />
              </div>
              <h3 className={`text-[17px] font-bold ${textPrimary} mb-1`}>
                {isToday ? 'Hôm nay chưa có lịch Makeup' : 'Chưa có lịch Makeup ngày này'}
              </h3>
              <p className={`text-[13px] ${textSecondary} max-w-xs mb-5`}>
                Tạo lịch mới để theo dõi thông tin khách, giờ makeup và người thực hiện nhanh chóng.
              </p>
              <button
                id="empty-state-add-btn"
                type="button"
                onClick={onOpenAddBooking}
                style={{ backgroundColor: accentConfig.hex }}
                className="px-5 py-2.5 rounded-full text-white font-semibold text-[14px] shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                + Thêm lịch
              </button>
            </div>
          ) : (
            <>
              {/* Subheader banner */}
              <div className="flex items-center justify-between px-1 pb-0.5">
                <span className={`text-[11px] font-bold uppercase tracking-widest ${textSecondary}`}>
                  {isToday ? 'HÔM NAY' : 'LỊCH TRONG NGÀY'} · {sortedBookings.length} LỊCH
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

              <div className={`space-y-3.5 sm:space-y-4 relative pl-2.5 before:absolute before:left-0.5 before:top-2 before:bottom-2 before:w-[2px] ${isDark ? 'before:bg-[#2C2C2E]' : 'before:bg-[#E5E5EA]'}`}>
                {sortedBookings.map((booking) => {
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
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

