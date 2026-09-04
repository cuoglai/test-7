import React from 'react';
import { Booking } from '../../types';
import { BookingCard } from '../booking/BookingCard';
import { findCTVConflicts } from '../../services/conflictService';
import { Plus, CalendarX } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface DayViewProps {
  date: string;
  isToday: boolean;
  bookings: Booking[];
  allBookings: Booking[];
  onSelectBooking: (booking: Booking) => void;
  onOpenAddBooking: () => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const DayView: React.FC<DayViewProps> = ({
  date,
  isToday,
  bookings,
  allBookings,
  onSelectBooking,
  onOpenAddBooking,
  onScroll
}) => {
  const { isDark, accentConfig } = useTheme();
  const sortedBookings = [...bookings].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const textPrimary = isDark ? 'text-white' : 'text-[#1C1C1E]';
  const textSecondary = isDark ? 'text-[#8E8E93]' : 'text-[#8E8E93]';
  const emptyIconBg = isDark ? 'bg-[#1C1C1E]' : 'bg-[#E5E5EA]/70';

  if (sortedBookings.length === 0) {
    return (
      <div
        id="day-view-container"
        onScroll={onScroll}
        className="flex-1 overflow-y-auto ios-scrollable"
        style={{
          WebkitOverflowScrolling: 'touch',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 16px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 16px)'
        }}
      >
        <div
          id="day-view-empty-state"
          style={{
            paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 12px) + 64px)'
          }}
          className="min-h-full flex flex-col items-center justify-center p-6 text-center"
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
      </div>
    );
  }

  return (
    <div
      id="day-view-container"
      onScroll={onScroll}
      className="flex-1 overflow-y-auto ios-scrollable pt-2"
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
        className="space-y-2.5"
      >
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

        <div className={`space-y-2 relative pl-2.5 before:absolute before:left-0.5 before:top-2 before:bottom-2 before:w-[2px] ${isDark ? 'before:bg-[#2C2C2E]' : 'before:bg-[#E5E5EA]'}`}>
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
      </div>
    </div>
  );
};
