import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Booking } from '../../types';
import { BookingCard } from './BookingCard';
import { Search, X, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import { findCTVConflicts } from '../../services/conflictService';
import { useTheme, hexToRgba } from '../../contexts/ThemeContext';
import { formatBookingCardDate } from '../../utils/formatters';

interface BookingListViewProps {
  bookings: Booking[];
  onSelectBooking: (booking: Booking) => void;
  onOpenAddBooking: () => void;
}

const FILTERS: ('all' | 'owner' | 'ctv')[] = ['all', 'owner', 'ctv'];

export const BookingListView: React.FC<BookingListViewProps> = ({
  bookings,
  onSelectBooking,
  onOpenAddBooking
}) => {
  const { isDark, accentConfig } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'owner' | 'ctv'>('all');
  const [direction, setDirection] = useState<number>(0);

  const handleSelectFilter = (newFilter: 'all' | 'owner' | 'ctv') => {
    const currentIndex = FILTERS.indexOf(filterType);
    const newIndex = FILTERS.indexOf(newFilter);
    if (newIndex !== currentIndex) {
      setDirection(newIndex > currentIndex ? 1 : -1);
      setFilterType(newFilter);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  };

  // Vuốt chuyển filter: chặn ở 2 đầu, không vuốt vòng tròn
  const handleSwipeNextFilter = () => {
    const currentIndex = FILTERS.indexOf(filterType);
    if (currentIndex < FILTERS.length - 1) {
      setDirection(1);
      setFilterType(FILTERS[currentIndex + 1]);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  };

  const handleSwipePrevFilter = () => {
    const currentIndex = FILTERS.indexOf(filterType);
    if (currentIndex > 0) {
      setDirection(-1);
      setFilterType(FILTERS[currentIndex - 1]);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  };

  // Cử chỉ chạm vuốt & kéo chuột để chuyển đổi bộ lọc
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

    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
    const isSufficient = Math.abs(deltaX) >= 35 || (Math.abs(deltaX) >= 20 && deltaTime < 300);

    if (isHorizontal && isSufficient) {
      if (deltaX < 0) {
        // Vuốt sang trái -> sang filter kế tiếp (Tất cả -> Tôi -> CTV), chặn ở CTV
        handleSwipeNextFilter();
      } else {
        // Vuốt sang phải -> về filter trước đó (CTV -> Tôi -> Tất cả), chặn ở Tất cả
        handleSwipePrevFilter();
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
        handleSwipeNextFilter();
      } else {
        handleSwipePrevFilter();
      }
    }
  };

  // 1. Thanh chuyển tháng: Mặc định chọn tháng hiện tại
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth() + 1);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoCurrentMonth = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
  };

  const selectedMonthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Lọc danh sách lịch hẹn trong tháng được chọn
  const monthBookings = useMemo(() => {
    return bookings.filter((b) => b.date && b.date.startsWith(selectedMonthPrefix));
  }, [bookings, selectedMonthPrefix]);

  // Stats - 3 chỉ số theo tháng được chọn: Tổng số ca, Tôi, CTV
  const stats = useMemo(() => {
    const active = monthBookings.filter((b) => b.status !== 'cancelled');
    const totalCount = active.length;
    const ownerCount = active.filter((b) => b.performerType === 'owner').length;
    const ctvCount = active.filter((b) => b.performerType === 'ctv').length;
    return { totalCount, ownerCount, ctvCount };
  }, [monthBookings]);

  // Lọc theo người làm & tìm kiếm trong tháng
  const filteredBookings = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return monthBookings.filter((b) => {
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
  }, [monthBookings, searchTerm, filterType]);

  // Nhóm danh sách bookings theo ngày để phân chia khung màu xen kẽ
  const groupedBookings = useMemo(() => {
    const map = new Map<string, Booking[]>();
    filteredBookings.forEach((b) => {
      const list = map.get(b.date) || [];
      list.push(b);
      map.set(b.date, list);
    });
    const entries = Array.from(map.entries());
    entries.sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([date, items]) => ({
      date,
      bookings: items.sort((a, b) => a.startTime.localeCompare(b.startTime))
    }));
  }, [filteredBookings]);

  // 3. Tự động xác định vị trí của lịch hẹn đầu tiên của ngày hôm nay (hoặc lịch hẹn chưa diễn ra gần nhất)
  const targetScrollDate = useMemo(() => {
    const now = new Date();
    const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (selectedMonthPrefix !== thisMonthPrefix) return null;

    // 1. Kiểm tra xem hôm nay có lịch không
    const todayGroup = groupedBookings.find((g) => g.date === todayStr);
    if (todayGroup) return todayStr;

    // 2. Nếu hôm nay không có lịch, tìm ngày chưa diễn ra gần nhất trong tháng
    const nextGroup = groupedBookings.find((g) => g.date > todayStr);
    if (nextGroup) return nextGroup.date;

    return null;
  }, [selectedMonthPrefix, groupedBookings, todayStr]);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const targetGroupRef = useRef<HTMLDivElement | null>(null);
  const lastScrolledMonthRef = useRef<string | null>(null);

  // Hiển thị ngay 'Ngày hôm nay' (hoặc ngày gần nhất) lên đầu màn hình khi lần đầu mở tháng đó
  // KHÔNG gọi khi chỉ đơn thuần chuyển đổi filterType (Tôi/CTV/Tất cả) để tránh giật / nảy trang
  useEffect(() => {
    if (!targetScrollDate) return;
    if (lastScrolledMonthRef.current === selectedMonthPrefix) return;
    lastScrolledMonthRef.current = selectedMonthPrefix;

    const jumpToTarget = () => {
      if (targetGroupRef.current) {
        targetGroupRef.current.scrollIntoView({
          behavior: 'instant' as ScrollBehavior,
          block: 'start'
        });
      }
    };

    jumpToTarget();
  }, [targetScrollDate, selectedMonthPrefix]);

  const viewBg = isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]';
  const cardBg = isDark ? 'bg-[#1C1C1E]' : 'bg-white';
  const cardBorder = isDark ? 'border-[#2C2C2E]' : 'border-[#E5E5EA]';
  const textPrimary = isDark ? 'text-white' : 'text-[#1C1C1E]';
  const textSecondary = isDark ? 'text-[#8E8E93]' : 'text-[#8E8E93]';
  const inputBg = isDark ? 'bg-[#2C2C2E]' : 'bg-[#F2F2F7]';

  return (
    <div id="booking-list-root" className={`flex-1 flex flex-col overflow-hidden ${viewBg}`}>
      {/* Static Compact Header: Cố định trạng thái thu gọn tối giản, không co giãn khi cuộn */}
      <div
        className={`${cardBg} border-b ${cardBorder} shrink-0 select-none`}
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
          paddingBottom: '10px',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 16px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 16px)'
        }}
      >
        {/* Hàng 1: Single-line Header (Bên trái: 'Booking', Bên phải: Cụm chuyển tháng < Tháng MM/YYYY >) */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className={`text-[18px] sm:text-[20px] font-bold ${textPrimary} tracking-tight`}>
            Booking
          </h2>

          {/* Cụm chuyển tháng < Tháng MM/YYYY > */}
          <div className="flex items-center gap-1">
            <button
              id="booking-prev-month-btn"
              type="button"
              onClick={handlePrevMonth}
              title="Tháng trước"
              className={`w-7.5 h-7.5 rounded-full ${inputBg} flex items-center justify-center ${textPrimary} hover:opacity-80 active:scale-95 transition-all cursor-pointer border ${cardBorder}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              id="booking-current-month-btn"
              type="button"
              onClick={handleGoCurrentMonth}
              title="Về tháng hiện tại"
              className={`text-[12px] font-bold px-2.5 h-7.5 rounded-full ${inputBg} ${textPrimary} hover:opacity-80 active:scale-95 transition-all cursor-pointer border ${cardBorder}`}
            >
              Tháng {String(currentMonth).padStart(2, '0')}/{currentYear}
            </button>

            <button
              id="booking-next-month-btn"
              type="button"
              onClick={handleNextMonth}
              title="Tháng sau"
              className={`w-7.5 h-7.5 rounded-full ${inputBg} flex items-center justify-center ${textPrimary} hover:opacity-80 active:scale-95 transition-all cursor-pointer border ${cardBorder}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hàng 2: Thanh bấm phân đoạn thu gọn (Segmented Pill Bar) - Tối ưu diện tích */}
        <div className="mb-2">
          <div
            className={`flex items-center p-1 rounded-xl border ${cardBorder} ${
              isDark ? 'bg-[#2C2C2E]' : 'bg-[#E5E5EA]/75'
            }`}
          >
            {/* Tất cả */}
            <button
              id="filter-all-btn"
              type="button"
              onClick={() => handleSelectFilter('all')}
              style={{
                backgroundColor: filterType === 'all' ? accentConfig.hex : 'transparent',
                color: filterType === 'all' ? '#FFFFFF' : undefined
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[12px] font-semibold transition-all cursor-pointer select-none active:scale-[0.98] ${
                filterType === 'all'
                  ? 'shadow-xs font-bold'
                  : `${textSecondary} hover:${textPrimary}`
              }`}
            >
              <span>Tất cả</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-bold leading-tight ${
                  filterType === 'all'
                    ? 'bg-white/25 text-white'
                    : isDark
                      ? 'bg-white/10 text-slate-300'
                      : 'bg-black/8 text-slate-600'
                }`}
              >
                {stats.totalCount}
              </span>
            </button>

            {/* Tôi */}
            <button
              id="filter-owner-btn"
              type="button"
              onClick={() => handleSelectFilter('owner')}
              style={{
                backgroundColor: filterType === 'owner' ? accentConfig.hex : 'transparent',
                color: filterType === 'owner' ? '#FFFFFF' : undefined
              }}
              className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-[12px] font-semibold transition-all cursor-pointer select-none active:scale-[0.98] ${
                filterType === 'owner'
                  ? 'shadow-xs font-bold'
                  : `${textSecondary} hover:${textPrimary}`
              }`}
            >
              <span className="text-[11px]">👑</span>
              <span>Tôi</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-bold leading-tight ${
                  filterType === 'owner'
                    ? 'bg-white/25 text-white'
                    : isDark
                      ? 'bg-white/10 text-slate-300'
                      : 'bg-black/8 text-slate-600'
                }`}
              >
                {stats.ownerCount}
              </span>
            </button>

            {/* CTV */}
            <button
              id="filter-ctv-btn"
              type="button"
              onClick={() => handleSelectFilter('ctv')}
              style={{
                backgroundColor: filterType === 'ctv' ? '#5856D6' : 'transparent',
                color: filterType === 'ctv' ? '#FFFFFF' : undefined
              }}
              className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-[12px] font-semibold transition-all cursor-pointer select-none active:scale-[0.98] ${
                filterType === 'ctv'
                  ? 'shadow-xs font-bold'
                  : `${textSecondary} hover:${textPrimary}`
              }`}
            >
              <span className="text-[11px]">🤝</span>
              <span>CTV</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-bold leading-tight ${
                  filterType === 'ctv'
                    ? 'bg-white/25 text-white'
                    : isDark
                      ? 'bg-white/10 text-slate-300'
                      : 'bg-black/8 text-slate-600'
                }`}
              >
                {stats.ctvCount}
              </span>
            </button>
          </div>
        </div>

        {/* Hàng 3: Ô tìm kiếm thu gọn - Đẩy sát lên */}
        <div className="relative">
          <Search className={`w-3.5 h-3.5 ${textSecondary} absolute left-3 top-1/2 -translate-y-1/2`} />
          <input
            id="booking-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên, SĐT, địa chỉ, ghi chú..."
            className={`w-full h-8 rounded-xl ${inputBg} text-[12.5px] ${textPrimary} placeholder:${textSecondary} focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] border border-transparent pl-8.5 pr-8`}
          />
          {searchTerm && (
            <button
              id="clear-search-btn"
              type="button"
              onClick={() => setSearchTerm('')}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${textSecondary} hover:${textPrimary}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Bookings List with horizontal swipe to switch filters */}
      <div
        ref={scrollContainerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        className="flex-1 overflow-y-auto ios-scrollable pt-3 select-none"
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 16px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 16px)'
        }}
      >
        <motion.div
          key={filterType}
          initial={{ x: direction > 0 ? 24 : direction < 0 ? -24 : 0, opacity: 0.85 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{
            x: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
            opacity: { duration: 0.15, ease: 'easeOut' }
          }}
          style={{
            paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 12px) + 64px)'
          }}
          className="space-y-4 sm:space-y-5"
        >
        {filteredBookings.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList className={`w-12 h-12 ${textSecondary} mx-auto mb-2 opacity-50`} />
            <p className={`text-[15px] font-semibold ${textPrimary}`}>
              Không có booking nào trong tháng {String(currentMonth).padStart(2, '0')}/{currentYear}
            </p>
            <p className={`text-[13px] ${textSecondary} mt-0.5`}>
              Thử tìm kiếm với từ khóa khác, đổi tháng hoặc tạo booking mới.
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
            const cardDate = formatBookingCardDate(group.date);
            const isToday = group.date === todayStr;
            const isPastDay = group.date < todayStr;
            const isScrollTarget = group.date === targetScrollDate;

            // 2. Phân loại màu sắc thẻ:
            // Lịch các ngày đã qua: không đổ màu nền như các lịch sắp tới (để transparent), vẫn có viền đầy đủ
            // Lịch từ hôm nay trở đi: đổ màu nền xen kẽ theo màu chủ đạo
            const containerBg = isPastDay
              ? 'transparent'
              : isOdd
                ? hexToRgba(accentConfig.hex, 0.30)
                : hexToRgba(accentConfig.hex, 0.10);

            const containerBorder = isPastDay
              ? isDark ? '#2C2C2E' : '#E5E5EA'
              : isOdd
                ? hexToRgba(accentConfig.hex, 0.40)
                : hexToRgba(accentConfig.hex, 0.18);

            return (
              <div
                key={group.date}
                id={`day-group-${group.date}`}
                ref={isScrollTarget ? targetGroupRef : undefined}
                style={{
                  backgroundColor: containerBg,
                  borderColor: containerBorder
                }}
                className="p-3 sm:p-3.5 rounded-2xl border transition-all space-y-2.5 shadow-2xs"
              >
                {/* Header hiển thị ngày: Thứ (In đậm) Ngày & Tháng (Font chữ thường), Bỏ năm */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[16px] sm:text-[17px] tracking-tight leading-none ${textPrimary}`}>
                      <strong className="font-bold">{cardDate.dayOfWeek}</strong>{' '}
                      <span className="font-normal">{cardDate.dayMonth}</span>
                    </span>
                    {isToday && (
                      <span
                        style={{ backgroundColor: accentConfig.hex }}
                        className="px-2 py-0.5 rounded-full text-[10.5px] font-extrabold text-white shadow-xs"
                      >
                        HÔM NAY
                      </span>
                    )}
                  </div>

                  <span
                    className="px-2 py-0.5 rounded-lg text-[11px] font-bold shadow-2xs"
                    style={{
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(0,0,0,0.06)',
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
                        isPast={isPastDay}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
        </motion.div>
      </div>
    </div>
  );
};
