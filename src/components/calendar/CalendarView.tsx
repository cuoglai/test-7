import React, { useMemo, useState } from 'react';
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
    >
      {/* Header: YNII MAKEUP + Ngày tháng + 4 nút thao tác nhỏ gọn */}
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
      />

      {/* Quick Summary & Filter Bar: Tất cả / Tôi / CTV kiêm thống kê */}
      <QuickStatsBar
        totalCount={stats.totalCount}
        ownerCount={stats.ownerCount}
        ctvCount={stats.ctvCount}
        labelPrefix={stats.prefix}
        filterType={filterType}
        onFilterChange={setFilterType}
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
          onSelectDate={onDateChange}
        />
      )}

      {mode === 'week' && (
        <WeekView
          currentDate={currentDate}
          allBookings={filteredBookings}
          onSelectDate={onDateChange}
          onSelectBooking={onSelectBooking}
          onOpenAddBooking={onOpenAddBooking}
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
