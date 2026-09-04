import React, { useRef } from 'react';
import { CalendarMode } from '../../types';
import { getVietnameseDateHeader, parseDateString } from '../../utils/formatters';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface HeaderProps {
  currentDate: string;
  todayDateStr?: string;
  mode: CalendarMode;
  onModeChange: (mode: CalendarMode) => void;
  onPrevDate: () => void;
  onNextDate: () => void;
  onToday: () => void;
  onSelectDate: (date: string) => void;
  isToday: boolean;
  scrollProgress?: number;
  isCollapsed?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  todayDateStr,
  mode,
  onModeChange,
  onPrevDate,
  onNextDate,
  onToday,
  onSelectDate,
  isToday,
  scrollProgress = 0,
  isCollapsed = false
}) => {
  const { isDark, accentConfig } = useTheme();
  const datePickerRef = useRef<HTMLInputElement>(null);
  const dateInfo = getVietnameseDateHeader(currentDate);

  // Lấy ngày của ngày đang xem (selectedDate / currentDate)
  // displayDay = selectedDate.getDate() (vd: 5/9 -> 5, 12/10 -> 12, 25/12 -> 25, 01/01 -> 1)
  const selectedDate = parseDateString(currentDate);
  const displayDay = selectedDate.getDate();

  // Chuẩn hóa scrollProgress trong khoảng [0, 1]
  // Vuốt đến đâu, header thu nhỏ mượt mà đến đó mà không bị nhảy bước
  const p = typeof scrollProgress === 'number'
    ? Math.min(1, Math.max(0, scrollProgress))
    : (isCollapsed ? 1 : 0);

  const headerBg = isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-[#E5E5EA]';
  const textPrimary = isDark ? 'text-white' : 'text-[#1C1C1E]';
  const btnBg = isDark ? 'bg-[#2C2C2E] text-white hover:bg-[#38383A]' : 'bg-[#F2F2F7] text-[#1C1C1E] hover:bg-[#E5E5EA]';

  return (
    <header
      id="calendar-header"
      className={`${headerBg} border-b shrink-0 select-none`}
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
        paddingBottom: `${Math.round(8 - p * 2)}px`,
        paddingLeft: 'max(env(safe-area-inset-left, 0px), 16px)',
        paddingRight: 'max(env(safe-area-inset-right, 0px), 16px)'
      }}
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. KHU VỰC TIÊU ĐỀ CHÍNH + ĐIỀU HƯỚNG                          */}
      {/*    Trạng thái đầy đủ:                                         */}
      {/*    YNII MAKEUP                                                */}
      {/*    Thứ Sáu, 4/9/2026                   [4] [📅] [‹] [›]       */}
      {/*                                                               */}
      {/*    Khi vuốt thu gọn:                                          */}
      {/*    YNII MAKEUP · Thứ Sáu, 4/9          [4] [📅] [‹] [›]       */}
      {/* ------------------------------------------------------------- */}
      <div className="flex justify-between items-center min-h-8">
        {/* Cột trái: Tên ứng dụng + Ngày tháng ở dòng dưới */}
        <div className="flex flex-col justify-center min-w-0 pr-2">
          {/* Hàng 1: YNII MAKEUP (kèm ngày inline thu gọn khi cuộn) */}
          <div className="flex items-center min-w-0">
            <span
              className="text-[12px] font-black tracking-widest uppercase shrink-0"
              style={{ color: accentConfig.hex }}
            >
              YNII MAKEUP
            </span>

            {/* Ngày inline: Chỉ hiện khi header thu gọn, KHÔNG hiển thị năm */}
            {/* Ví dụ: · T2,4/9 hoặc · T6,4/9 */}
            <div
              style={{
                opacity: Math.min(1, Math.max(0, (p - 0.15) / 0.6)),
                maxWidth: `${p * 140}px`,
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }}
              className="flex items-center ml-1.5 transition-all shrink-0"
            >
              <span className={`text-[12px] font-extrabold ${textPrimary} truncate`}>
                · {dateInfo.collapsedDateVi}
              </span>
            </div>
          </div>

          {/* Hàng 2: Thông tin ngày tháng năm đầy đủ ngay dưới tên app  */}
          {/* Ví dụ: Thứ Sáu, 4/9/2026 - Tự động thu gọn và mờ khi vuốt */}
          <div
            style={{
              height: `${Math.max(0, (1 - p) * 22)}px`,
              opacity: Math.max(0, 1 - p * 1.6),
              marginTop: `${Math.max(0, (1 - p) * 2)}px`,
              overflow: 'hidden'
            }}
            className="flex items-center min-w-0 transition-all"
          >
            <span className={`text-[14px] sm:text-[15px] font-bold ${textPrimary} tracking-tight truncate`}>
              {dateInfo.fullDateVi}
            </span>
          </div>
        </div>

        {/* Cột phải: 4 nút điều khiển [ô ngày] [📅] [‹] [›] nhỏ gọn, tiết kiệm diện tích không che ngày */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* 1. NÚT HIỆN NGÀY / HÔM NAY: Kích thước 28x28px (mobile) - 32x32px (sm) */}
          <button
            id="header-today-btn"
            type="button"
            onClick={onToday}
            title={isToday ? "Hôm nay" : `Về hôm nay (đang xem ngày ${displayDay})`}
            aria-label="Về hôm nay"
            style={{
              backgroundColor: accentConfig.hex,
              color: '#FFFFFF',
              borderColor: accentConfig.hex
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer active:scale-95 shadow-2xs select-none transition-transform"
          >
            <span className="text-[12px] sm:text-[13px] font-black tracking-tight text-white select-none">
              {displayDay}
            </span>
          </button>

          {/* 2. NÚT LỊCH [📅]: Chạm vào mở trình chọn ngày tháng năm ngay lập tức */}
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 shrink-0">
            <button
              id="header-picker-btn"
              type="button"
              title="Chọn ngày tháng năm"
              aria-label="Chọn ngày tháng năm"
              className={`w-full h-full rounded-lg ${btnBg} flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs`}
            >
              <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-90" />
            </button>
            {/* Input type date phủ vừa vặn trên nút để khi chạm tay vào là mở Date Picker của iOS / Android */}
            <input
              ref={datePickerRef}
              type="date"
              value={currentDate}
              onChange={(e) => {
                if (e.target.value) onSelectDate(e.target.value);
              }}
              title="Chọn ngày trên lịch"
              aria-label="Chọn ngày tháng năm"
              className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
            />
          </div>

          {/* 3. NÚT MŨI TÊN TRÁI [‹]: Chuyển sang ngày/tuần/tháng trước */}
          <button
            id="header-prev-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrevDate();
            }}
            title="Lùi lại"
            aria-label="Lùi lại"
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${btnBg} flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs`}
          >
            <ChevronLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* 4. NÚT MŨI TÊN PHẢI [›]: Chuyển sang ngày/tuần/tháng tiếp theo */}
          <button
            id="header-next-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNextDate();
            }}
            title="Tiếp theo"
            aria-label="Tiếp theo"
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${btnBg} flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs`}
          >
            <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. CHỌN CHẾ ĐỘ: Ngày | Tuần | Tháng                           */}
      {/*    Fade out và thu gọn liên tục theo tiến trình vuốt            */}
      {/* ------------------------------------------------------------- */}
      <div
        style={{
          height: `${Math.max(0, (1 - p) * 30)}px`,
          opacity: Math.max(0, 1 - p * 1.8),
          marginTop: `${Math.max(0, (1 - p) * 6)}px`,
          transform: `translateY(-${p * 4}px)`,
          overflow: 'hidden',
          pointerEvents: p > 0.6 ? 'none' : 'auto'
        }}
        className="flex space-x-1.5"
      >
        <button
          id="mode-day-btn"
          type="button"
          onClick={() => onModeChange('day')}
          style={mode === 'day' ? { backgroundColor: accentConfig.hex, color: '#FFFFFF' } : undefined}
          className={`px-3.5 py-1 text-[12px] font-semibold rounded-full transition-all cursor-pointer ${
            mode === 'day'
              ? 'shadow-xs'
              : `${btnBg} opacity-80 hover:opacity-100`
          }`}
        >
          Ngày
        </button>
        <button
          id="mode-week-btn"
          type="button"
          onClick={() => onModeChange('week')}
          style={mode === 'week' ? { backgroundColor: accentConfig.hex, color: '#FFFFFF' } : undefined}
          className={`px-3.5 py-1 text-[12px] font-semibold rounded-full transition-all cursor-pointer ${
            mode === 'week'
              ? 'shadow-xs'
              : `${btnBg} opacity-80 hover:opacity-100`
          }`}
        >
          Tuần
        </button>
        <button
          id="mode-month-btn"
          type="button"
          onClick={() => onModeChange('month')}
          style={mode === 'month' ? { backgroundColor: accentConfig.hex, color: '#FFFFFF' } : undefined}
          className={`px-3.5 py-1 text-[12px] font-semibold rounded-full transition-all cursor-pointer ${
            mode === 'month'
              ? 'shadow-xs'
              : `${btnBg} opacity-80 hover:opacity-100`
          }`}
        >
          Tháng
        </button>
      </div>
    </header>
  );
};
