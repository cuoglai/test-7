import React, { useState, useMemo } from 'react';
import { Booking } from '../../types';
import { BookingCard } from './BookingCard';
import { Search, X, ClipboardList } from 'lucide-react';
import { findCTVConflicts } from '../../services/conflictService';
import { useTheme, hexToRgba } from '../../contexts/ThemeContext';
import { formatBookingCardDate } from '../../utils/formatters';

interface BookingListViewProps {
  bookings: Booking[];
  onSelectBooking: (booking: Booking) => void;
  onOpenAddBooking: () => void;
}

export const BookingListView: React.FC<BookingListViewProps> = ({
  bookings,
  onSelectBooking,
  onOpenAddBooking
}) => {
  const { isDark, accentConfig } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'owner' | 'ctv'>('all');
  const [scrollProgress, setScrollProgress] = useState(0);

  const COLLAPSE_DISTANCE = 70;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = Math.max(0, e.currentTarget.scrollTop);
    const progress = Math.min(1, Math.max(0, top / COLLAPSE_DISTANCE));
    setScrollProgress(progress);
  };

  const p = scrollProgress;

  // Stats - 3 required indicators: Tổng số ca, Tôi, CTV
  const stats = useMemo(() => {
    const active = bookings.filter((b) => b.status !== 'cancelled');
    const totalCount = active.length;
    const ownerCount = active.filter((b) => b.performerType === 'owner').length;
    const ctvCount = active.filter((b) => b.performerType === 'ctv').length;
    return { totalCount, ownerCount, ctvCount };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return bookings.filter((b) => {
      // Filter by performer type
      if (filterType === 'owner' && b.performerType !== 'owner') return false;
      if (filterType === 'ctv' && b.performerType !== 'ctv') return false;

      // Search by name, makeupInfo, note, phone, address
      const matchText =
        !term ||
        b.customerName.toLowerCase().includes(term) ||
        (b.makeupInfo && b.makeupInfo.toLowerCase().includes(term)) ||
        (b.note && b.note.toLowerCase().includes(term)) ||
        b.customerPhone.includes(term) ||
        b.customerAddress.toLowerCase().includes(term) ||
        b.packageNameSnapshot.toLowerCase().includes(term) ||
        (b.ctvNameSnapshot && b.ctvNameSnapshot.toLowerCase().includes(term));

      return matchText;
    });
  }, [bookings, searchTerm, filterType]);

  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Nhóm danh sách bookings theo ngày để phân chia khung màu xen kẽ
  const groupedBookings = useMemo(() => {
    const map = new Map<string, Booking[]>();
    filteredBookings.forEach((b) => {
      const list = map.get(b.date) || [];
      list.push(b);
      map.set(b.date, list);
    });
    return Array.from(map.entries()).map(([date, items]) => ({
      date,
      bookings: items
    }));
  }, [filteredBookings]);

  const viewBg = isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]';
  const cardBg = isDark ? 'bg-[#1C1C1E]' : 'bg-white';
  const cardBorder = isDark ? 'border-[#2C2C2E]' : 'border-[#E5E5EA]';
  const textPrimary = isDark ? 'text-white' : 'text-[#1C1C1E]';
  const textSecondary = isDark ? 'text-[#8E8E93]' : 'text-[#8E8E93]';
  const inputBg = isDark ? 'bg-[#2C2C2E]' : 'bg-[#F2F2F7]';

  return (
    <div id="booking-list-root" className={`flex-1 flex flex-col overflow-hidden ${viewBg}`}>
      {/* Header with Title, Stats & Filter, and Search - Tự động thu gọn liên tục khi vuốt */}
      <div
        className={`${cardBg} border-b ${cardBorder} shrink-0 select-none`}
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
          paddingBottom: `${Math.round(11 - p * 3)}px`,
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 16px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 16px)'
        }}
      >
        <div className="flex justify-between items-center mb-2.5">
          <h2
            style={{ fontSize: `${Math.round(19 - p * 3)}px` }}
            className={`font-bold ${textPrimary} tracking-tight`}
          >
            Danh sách Booking
          </h2>
          <button
            type="button"
            onClick={onOpenAddBooking}
            style={{ backgroundColor: accentConfig.hex }}
            className="px-3 py-1 rounded-full text-white text-[12px] font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            + Tạo lịch
          </button>
        </div>

        {/* 3 Thống kê & Bộ lọc: Tổng số ca, Tôi, CTV - Tự động thu gọn mượt mà theo scrollProgress */}
        <div
          className="grid grid-cols-3 mb-2.5"
          style={{ gap: `${Math.round(8 - p * 2)}px` }}
        >
          {/* 1. Tất cả */}
          <button
            type="button"
            onClick={() => setFilterType('all')}
            style={{
              backgroundColor: filterType === 'all' ? accentConfig.hex : undefined,
              borderColor: filterType === 'all' ? accentConfig.hex : undefined,
              color: filterType === 'all' ? '#FFFFFF' : undefined,
              paddingTop: `${Math.round(6 - p * 2.5)}px`,
              paddingBottom: `${Math.round(6 - p * 2.5)}px`,
              borderRadius: `${Math.round(12 - p * 2)}px`
            }}
            className={`px-2 text-center border cursor-pointer active:scale-[0.98] ${
              filterType === 'all'
                ? 'shadow-xs'
                : `${isDark ? 'bg-[#2C2C2E] border-[#38383A]' : 'bg-[#F9F9F9] border-[#E5E5EA]'} ${textPrimary} hover:opacity-80`
            }`}
          >
            <div className="flex flex-col items-center justify-center text-center">
              <div
                style={{
                  height: `${Math.max(0, (1 - p) * 14)}px`,
                  opacity: Math.max(0, 1 - p * 1.8),
                  marginBottom: `${Math.max(0, (1 - p) * 2)}px`,
                  overflow: 'hidden'
                }}
                className={`text-[10px] uppercase font-bold tracking-wider truncate ${
                  filterType === 'all' ? 'text-white/80' : textSecondary
                }`}
              >
                Tổng số ca
              </div>
              <div
                style={{ fontSize: `${Math.round(15 - p * 2.5)}px` }}
                className="font-extrabold leading-tight flex items-center justify-center"
              >
                <span
                  style={{
                    opacity: Math.min(1, Math.max(0, (p - 0.2) / 0.7)),
                    maxWidth: `${p * 50}px`,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    marginRight: `${p * 4}px`
                  }}
                  className="text-[11px] font-bold"
                >
                  Tất cả
                </span>
                <span>{stats.totalCount}</span>
                <span
                  style={{
                    opacity: Math.max(0, 1 - p * 1.8),
                    maxWidth: `${(1 - p) * 18}px`,
                    overflow: 'hidden',
                    marginLeft: `${(1 - p) * 3}px`
                  }}
                  className={`text-[11px] font-normal ${filterType === 'all' ? 'text-white/80' : textSecondary}`}
                >
                  ca
                </span>
              </div>
            </div>
          </button>

          {/* 2. Tôi */}
          <button
            type="button"
            onClick={() => setFilterType('owner')}
            style={{
              backgroundColor: filterType === 'owner' ? accentConfig.hex : undefined,
              borderColor: filterType === 'owner' ? accentConfig.hex : undefined,
              color: filterType === 'owner' ? '#FFFFFF' : undefined,
              paddingTop: `${Math.round(6 - p * 2.5)}px`,
              paddingBottom: `${Math.round(6 - p * 2.5)}px`,
              borderRadius: `${Math.round(12 - p * 2)}px`
            }}
            className={`px-2 text-center border cursor-pointer active:scale-[0.98] ${
              filterType === 'owner'
                ? 'shadow-xs'
                : `${isDark ? 'bg-[#2C2C2E] border-[#38383A]' : 'bg-[#F9F9F9] border-[#E5E5EA]'} ${textPrimary} hover:opacity-80`
            }`}
          >
            <div className="flex flex-col items-center justify-center text-center">
              <div
                style={{
                  height: `${Math.max(0, (1 - p) * 14)}px`,
                  opacity: Math.max(0, 1 - p * 1.8),
                  marginBottom: `${Math.max(0, (1 - p) * 2)}px`,
                  overflow: 'hidden'
                }}
                className={`text-[10px] uppercase font-bold tracking-wider truncate flex items-center justify-center gap-0.5 ${
                  filterType === 'owner' ? 'text-white/80' : textSecondary
                }`}
              >
                <span>👑</span> Tôi
              </div>
              <div
                style={{ fontSize: `${Math.round(15 - p * 2.5)}px` }}
                className="font-extrabold leading-tight flex items-center justify-center"
              >
                <span
                  style={{
                    opacity: Math.min(1, Math.max(0, (p - 0.2) / 0.7)),
                    maxWidth: `${p * 50}px`,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    marginRight: `${p * 4}px`
                  }}
                  className="text-[11px] font-bold"
                >
                  👑 Tôi
                </span>
                <span style={{ color: filterType === 'owner' ? '#FFFFFF' : accentConfig.hex }}>
                  {stats.ownerCount}
                </span>
                <span
                  style={{
                    opacity: Math.max(0, 1 - p * 1.8),
                    maxWidth: `${(1 - p) * 18}px`,
                    overflow: 'hidden',
                    marginLeft: `${(1 - p) * 3}px`
                  }}
                  className={`text-[11px] font-normal ${filterType === 'owner' ? 'text-white/80' : textSecondary}`}
                >
                  ca
                </span>
              </div>
            </div>
          </button>

          {/* 3. CTV */}
          <button
            type="button"
            onClick={() => setFilterType('ctv')}
            style={{
              paddingTop: `${Math.round(6 - p * 2.5)}px`,
              paddingBottom: `${Math.round(6 - p * 2.5)}px`,
              borderRadius: `${Math.round(12 - p * 2)}px`
            }}
            className={`px-2 text-center border cursor-pointer active:scale-[0.98] ${
              filterType === 'ctv'
                ? 'bg-[#5856D6] text-white border-[#5856D6] shadow-xs'
                : `${isDark ? 'bg-[#2C2C2E] border-[#38383A]' : 'bg-[#F9F9F9] border-[#E5E5EA]'} text-[#5856D6] hover:opacity-80`
            }`}
          >
            <div className="flex flex-col items-center justify-center text-center">
              <div
                style={{
                  height: `${Math.max(0, (1 - p) * 14)}px`,
                  opacity: Math.max(0, 1 - p * 1.8),
                  marginBottom: `${Math.max(0, (1 - p) * 2)}px`,
                  overflow: 'hidden'
                }}
                className={`text-[10px] uppercase font-bold tracking-wider truncate flex items-center justify-center gap-0.5 ${
                  filterType === 'ctv' ? 'text-white/80' : textSecondary
                }`}
              >
                <span>🤝</span> CTV
              </div>
              <div
                style={{ fontSize: `${Math.round(15 - p * 2.5)}px` }}
                className="font-extrabold leading-tight flex items-center justify-center"
              >
                <span
                  style={{
                    opacity: Math.min(1, Math.max(0, (p - 0.2) / 0.7)),
                    maxWidth: `${p * 50}px`,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    marginRight: `${p * 4}px`
                  }}
                  className="text-[11px] font-bold"
                >
                  🤝 CTV
                </span>
                <span className={filterType === 'ctv' ? 'text-white' : 'text-[#5856D6]'}>
                  {stats.ctvCount}
                </span>
                <span
                  style={{
                    opacity: Math.max(0, 1 - p * 1.8),
                    maxWidth: `${(1 - p) * 18}px`,
                    overflow: 'hidden',
                    marginLeft: `${(1 - p) * 3}px`
                  }}
                  className={`text-[11px] font-normal ${filterType === 'ctv' ? 'text-white/80' : textSecondary}`}
                >
                  ca
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className={`w-4 h-4 ${textSecondary} absolute left-3.5 top-1/2 -translate-y-1/2`} />
          <input
            id="booking-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên, SĐT, địa chỉ, ghi chú..."
            className={`w-full h-9 rounded-xl ${inputBg} text-[13px] ${textPrimary} placeholder:${textSecondary} focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] border border-transparent pl-9 pr-9`}
          />
          {searchTerm && (
            <button
              id="clear-search-btn"
              type="button"
              onClick={() => setSearchTerm('')}
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${textSecondary} hover:${textPrimary}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bookings List with min-h for smooth header collapse on any length */}
      <div
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto ios-scrollable pt-3"
        style={{
          WebkitOverflowScrolling: 'touch',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 16px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 16px)'
        }}
      >
        <div
          style={{
            paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 12px) + 64px)'
          }}
          className="space-y-4 sm:space-y-5"
        >
        {filteredBookings.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList className={`w-12 h-12 ${textSecondary} mx-auto mb-2 opacity-50`} />
            <p className={`text-[15px] font-semibold ${textPrimary}`}>Không tìm thấy booking nào</p>
            <p className={`text-[13px] ${textSecondary} mt-0.5`}>
              Thử tìm kiếm với từ khóa khác hoặc tạo booking mới.
            </p>
            <button
              type="button"
              onClick={onOpenAddBooking}
              style={{ backgroundColor: accentConfig.hex }}
              className="mt-4 px-4 py-2 text-white text-[13px] font-bold rounded-xl shadow-xs cursor-pointer hover:opacity-90 active:scale-95 transition-all"
            >
              + Tạo booking mới
            </button>
          </div>
        ) : (
          groupedBookings.map((group, groupIdx) => {
            const isOdd = groupIdx % 2 === 1;
            // Đổ màu chủ đạo ở ngoài các khung ô lịch: xen kẽ 10% và 30% opacity
            const containerBg = isOdd
              ? hexToRgba(accentConfig.hex, 0.30)
              : hexToRgba(accentConfig.hex, 0.10);
            const containerBorder = isOdd
              ? hexToRgba(accentConfig.hex, 0.40)
              : hexToRgba(accentConfig.hex, 0.18);

            const cardDate = formatBookingCardDate(group.date);
            const isToday = group.date === todayStr;

            return (
              <div
                key={group.date}
                id={`day-group-${group.date}`}
                style={{
                  backgroundColor: containerBg,
                  borderColor: containerBorder
                }}
                className="p-3 sm:p-3.5 rounded-2xl border shadow-2xs space-y-2.5 transition-all"
              >
                {/* Header hiển thị ngày: Thứ (In đậm) Ngày & Tháng (Font chữ thường), Bỏ năm */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className={`text-[16px] sm:text-[17px] ${textPrimary} tracking-tight leading-none`}>
                      <span className="font-bold">{cardDate.dayOfWeek}</span>{' '}
                      <span className="font-normal">{cardDate.dayMonth}</span>
                    </span>
                    {isToday && (
                      <span
                        className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white uppercase tracking-wider shadow-2xs"
                        style={{ backgroundColor: accentConfig.hex }}
                      >
                        Hôm nay
                      </span>
                    )}
                  </div>

                  <span
                    className="px-2 py-0.5 rounded-lg text-[11px] font-bold shadow-2xs"
                    style={{
                      backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.85)',
                      color: textPrimary
                    }}
                  >
                    {group.bookings.length} ca
                  </span>
                </div>

                {/* Danh sách các ca makeup trong ngày */}
                <div className="space-y-3.5 sm:space-y-4">
                  {group.bookings.map((booking) => {
                    const conflicts = findCTVConflicts(bookings, {
                      id: booking.id,
                      date: booking.date,
                      startTime: booking.startTime,
                      endTime: booking.endTime,
                      performerType: booking.performerType,
                      ctvId: booking.ctvId
                    });

                    return (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        hasConflict={conflicts.length > 0}
                        onSelect={onSelectBooking}
                        showDate={true}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>
    </div>
  );
};
