import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Booking, CalendarMode } from '../../types';
import { Header } from '../layout/Header';
import { QuickStatsBar } from '../layout/QuickStatsBar';
import { DayView } from './DayView';
import { WeekView } from './WeekView';
import { MonthView } from './MonthView';
import { parseDateString, formatDateString } from '../../utils/formatters';

interface CalendarViewProps {
  currentDate: string;
  mode: CalendarMode;
  bookings: Booking[];
  todayDateStr: string;
  onDateChange: (date: string) => void;
  onModeChange: (mode: CalendarMode) => void;
  onSelectBooking: (booking: Booking) => void;
  onOpenAddBooking: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentDate,
  mode,
  bookings,
  todayDateStr,
  onDateChange,
  onModeChange,
  onSelectBooking,
  onOpenAddBooking
}) => {
  // 3 Bộ lọc: 'all' (Tất cả) | 'owner' (Tôi) | 'ctv' (CTV)
  const [filterType, setFilterType] = useState<'all' | 'owner' | 'ctv'>('all');

  // Trạng thái thu gọn/phóng ra tự động
  // Tự động thu lại khi kéo lên vượt qua 50% giá trị thu vào (>= 30px)
  // Phóng ra khi kéo lên xuống chạm đầu trang (<= 4px)
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Khi đổi ngày hoặc chế độ xem, phóng ra lại trạng thái ban đầu
  useEffect(() => {
    setIsCollapsed(false);
  }, [currentDate, mode]);

  // Ngưỡng 50% của hành động thu vào (30px)
  const THRESHOLD_COLLAPSE = 30;

  // Xử lý scroll dứt khoát: không giật lag, không phụ thuộc nhiều/ít lịch
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = Math.max(0, e.currentTarget.scrollTop);
    if (!isCollapsed && top >= THRESHOLD_COLLAPSE) {
      setIsCollapsed(true);
    } else if (isCollapsed && top <= 4) {
      setIsCollapsed(false);
    }
  };

  // Cử chỉ chạm vuốt (Touch Swipe) trực tiếp:
  // Đảm bảo hoạt động ổn định 100% trên thiết bị di động kể cả những ngày có 0 hoặc 1 lịch
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = touchStartY.current - currentY; // > 0 là vuốt lên, < 0 là vuốt xuống

    // Vuốt lên vượt qua ngưỡng 30px (50%) -> tự động thu gọn
    if (deltaY > THRESHOLD_COLLAPSE && !isCollapsed) {
      setIsCollapsed(true);
    }
    // Vuốt xuống khi ở đầu trang -> phóng ra
    else if (deltaY < -THRESHOLD_COLLAPSE && isCollapsed) {
      setIsCollapsed(false);
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  const scrollProgress = isCollapsed ? 1 : 0;

  // Navigation helper
  const handlePrev = () => {
    const d = parseDateString(currentDate);
    if (mode === 'day') {
      d.setDate(d.getDate() - 1);
    } else if (mode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    onDateChange(formatDateString(d));
  };

  const handleNext = () => {
    const d = parseDateString(currentDate);
    if (mode === 'day') {
      d.setDate(d.getDate() + 1);
    } else if (mode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    onDateChange(formatDateString(d));
  };

  const handleToday = () => {
    onDateChange(todayDateStr);
  };

  // Compute statistics depending on current view scope
  const stats = useMemo(() => {
    let scopeBookings: Booking[] = [];
    let prefix = '';

    if (mode === 'day') {
      scopeBookings = bookings.filter((b) => b.date === currentDate && b.status !== 'cancelled');
      prefix = currentDate === todayDateStr ? 'Hôm nay' : 'Ngày';
    } else if (mode === 'week') {
      const d = parseDateString(currentDate);
      const day = d.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(d);
      monday.setDate(d.getDate() + diffToMonday);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const monStr = formatDateString(monday);
      const sunStr = formatDateString(sunday);

      scopeBookings = bookings.filter(
        (b) => b.date >= monStr && b.date <= sunStr && b.status !== 'cancelled'
      );
      prefix = 'Tuần này';
    } else {
      const ym = currentDate.substring(0, 7);
      scopeBookings = bookings.filter((b) => b.date.startsWith(ym) && b.status !== 'cancelled');
      prefix = 'Tháng này';
    }

    const totalCount = scopeBookings.length;
    const ownerCount = scopeBookings.filter((b) => b.performerType === 'owner').length;
    const ctvCount = scopeBookings.filter((b) => b.performerType === 'ctv').length;

    return { totalCount, ownerCount, ctvCount, prefix };
  }, [bookings, currentDate, mode, todayDateStr]);

  // Filter bookings for current day / view based on filterType
  const filteredBookings = useMemo(() => {
    if (filterType === 'all') return bookings;
    return bookings.filter((b) => b.performerType === filterType);
  }, [bookings, filterType]);

  const dayBookings = useMemo(() => {
    return filteredBookings.filter((b) => b.date === currentDate);
  }, [filteredBookings, currentDate]);

  return (
    <div
      id="calendar-view-container"
      className="flex-1 flex flex-col h-full min-h-0 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header: YNII MAKEUP + Ngày tháng + 4 nút thao tác nhỏ gọn, tự động thu gọn mượt mà */}
      <Header
        currentDate={currentDate}
        todayDateStr={todayDateStr}
        mode={mode}
        onModeChange={onModeChange}
        onPrevDate={handlePrev}
        onNextDate={handleNext}
        onToday={handleToday}
        onSelectDate={onDateChange}
        isToday={currentDate === todayDateStr}
        scrollProgress={scrollProgress}
        isCollapsed={isCollapsed}
      />

      {/* Quick Summary & Filter Bar: Tất cả / Tôi / CTV kiêm thống kê */}
      <QuickStatsBar
        totalCount={stats.totalCount}
        ownerCount={stats.ownerCount}
        ctvCount={stats.ctvCount}
        labelPrefix={stats.prefix}
        filterType={filterType}
        onFilterChange={setFilterType}
        scrollProgress={scrollProgress}
        isCollapsed={isCollapsed}
      />

      {/* Main View Area */}
      {mode === 'day' && (
        <DayView
          date={currentDate}
          isToday={currentDate === todayDateStr}
          bookings={dayBookings}
          allBookings={bookings}
          onSelectBooking={onSelectBooking}
          onOpenAddBooking={onOpenAddBooking}
          onScroll={handleScroll}
        />
      )}

      {mode === 'week' && (
        <WeekView
          currentDate={currentDate}
          allBookings={filteredBookings}
          onSelectDate={onDateChange}
          onSelectBooking={onSelectBooking}
          onOpenAddBooking={onOpenAddBooking}
          onScroll={handleScroll}
          scrollProgress={scrollProgress}
        />
      )}

      {mode === 'month' && (
        <MonthView
          currentDate={currentDate}
          allBookings={filteredBookings}
          onSelectDay={(dayStr) => {
            onDateChange(dayStr);
            onModeChange('day');
          }}
          onMonthChange={onDateChange}
        />
      )}
    </div>
  );
};
