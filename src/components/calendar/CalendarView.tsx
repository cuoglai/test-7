import React, { useMemo, useState, useEffect } from 'react';
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

  // Tiến trình thu gọn liên tục theo khoảng cách cuộn (0: mở rộng -> 1: thu gọn hoàn toàn)
  const [scrollProgress, setScrollProgress] = useState(0);

  // Khi chuyển ngày hoặc chế độ, reset tiến trình thu gọn về ban đầu (0)
  useEffect(() => {
    setScrollProgress(0);
  }, [currentDate, mode]);

  // Khoảng cách vuốt cần thiết để thu gọn hoàn toàn header (70px)
  const COLLAPSE_DISTANCE = 70;

  // Lắng nghe scroll để tính scrollProgress liên tục mượt mà theo từng pixel
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = Math.max(0, e.currentTarget.scrollTop);
    const progress = Math.min(1, Math.max(0, top / COLLAPSE_DISTANCE));
    setScrollProgress(progress);
  };

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
      // Find week start (Monday) and end (Sunday)
      const current = parseDateString(currentDate);
      const dayOfWeek = current.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(current);
      monday.setDate(current.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const monStr = formatDateString(monday);
      const sunStr = formatDateString(sunday);

      scopeBookings = bookings.filter(
        (b) => b.date >= monStr && b.date <= sunStr && b.status !== 'cancelled'
      );
      prefix = 'Tuần này';
    } else {
      // Month
      const currentMonthPrefix = currentDate.substring(0, 7); // YYYY-MM
      scopeBookings = bookings.filter(
        (b) => b.date.startsWith(currentMonthPrefix) && b.status !== 'cancelled'
      );
      prefix = 'Tháng';
    }

    const totalCount = scopeBookings.length;
    const ownerCount = scopeBookings.filter((b) => b.performerType === 'owner').length;
    const ctvCount = scopeBookings.filter((b) => b.performerType === 'ctv').length;

    return { totalCount, ownerCount, ctvCount, prefix };
  }, [mode, currentDate, bookings, todayDateStr]);

  // Danh sách bookings được lọc theo bộ lọc: Tất cả | Tôi | CTV
  const filteredBookings = useMemo(() => {
    if (filterType === 'owner') {
      return bookings.filter((b) => b.performerType === 'owner');
    }
    if (filterType === 'ctv') {
      return bookings.filter((b) => b.performerType === 'ctv');
    }
    return bookings;
  }, [bookings, filterType]);

  const dayBookings = useMemo(() => {
    return filteredBookings.filter((b) => b.date === currentDate);
  }, [filteredBookings, currentDate]);

  return (
    <div id="calendar-view-root" className="flex-1 flex flex-col overflow-hidden">
      {/* Top Header: Tên YNII MAKEUP dòng riêng, cụm Ngày Tháng Năm 1 dòng cân đối, tự động thu gọn liên tục khi vuốt */}
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
        isCollapsed={scrollProgress > 0.6}
      />

      {/* Quick Summary & Filter Bar: Tất cả / Tôi / CTV kiêm thống kê, thu gọn liên tục khi vuốt */}
      <QuickStatsBar
        totalCount={stats.totalCount}
        ownerCount={stats.ownerCount}
        ctvCount={stats.ctvCount}
        labelPrefix={stats.prefix}
        filterType={filterType}
        onFilterChange={setFilterType}
        scrollProgress={scrollProgress}
        isCollapsed={scrollProgress > 0.6}
      />

      {/* Main View Area: truyền onScroll để kích hoạt hiệu ứng thu gọn mượt mà */}
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
