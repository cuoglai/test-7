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
  isToday
}) => {
  const { isDark, accentConfig } = useTheme();
  const datePickerRef = useRef<HTMLInputElement>(null);
  const dateInfo = getVietnameseDateHeader(currentDate);

  // Lấy ngày của ngày đang xem (selectedDate / currentDate)
  const selectedDate = parseDateString(currentDate);
  const displayDay = selectedDate.getDate();

  const headerBg = isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-[#E5E5EA]';
  const textPrimary = isDark ? 'text-white' : 'text-[#1C1C1E]';
  const btnBg = isDark ? 'bg-[#2C2C2E] text-white hover:bg-[#38383A]' : 'bg-[#F2F2F7] text-[#1C1C1E] hover:bg-[#E5E5EA]';

  return (
    <header
      id="calendar-header"
      className={`${headerBg} border-b shrink-0 select-none`}
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 10px)',
        paddingBottom: '8px',
        paddingLeft: 'max(env(safe-area-inset-left, 0px), 16px)',
        paddingRight: 'max(env(safe-area-inset-right, 0px), 16px)'
      }}
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. KHU VỰC TIÊU ĐỀ CHÍNH + ĐIỀU HƯỚNG                          */}
      {/*    YNII MAKEUP                                                */}
      {/*    Thứ Sáu, 4/9/2026                   [4] [📅] [‹] [›]       */}
      {/* ------------------------------------------------------------- */}
      <div className="flex justify-between items-center min-h-8">
        {/* Cột trái: Tên ứng dụng + Ngày tháng ở dòng dưới */}
        <div className="flex flex-col justify-center min-w-0 pr-2">
          {/* Hàng 1: YNII MAKEUP */}
          <div className="flex items-center min-w-0">
            <span
              className="text-[12px] font-black tracking-widest uppercase shrink-0"
              style={{ color: accentConfig.hex }}
            >
              YNII MAKEUP
            </span>
          </div>

          {/* Hàng 2: Thông tin ngày tháng năm đầy đủ ngay dưới tên app (vd: Thứ Sáu, 4/9/2026) */}
          <div className="flex items-center min-w-0 mt-0.5">
            <span className={`text-[14px] sm:text-[15px] font-bold ${textPrimary} tracking-tight truncate`}>
              {dateInfo.fullDateVi}
            </span>
          </div>
        </div>

        {/* Cột phải: 4 nút điều khiển [ô ngày] [📅] [‹] [›] nhỏ gọn */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* 1. NÚT HIỆN NGÀY / HÔM NAY */}
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
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 shrink-0 overflow-hidden">
            <button
              id="header-picker-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (datePickerRef.current) {
                  if (typeof datePickerRef.current.showPicker === 'function') {
                    try {
                      datePickerRef.current.showPicker();
                      return;
                    } catch {
                      // fallback to click
                    }
                  }
                  datePickerRef.current.click();
                }
              }}
              title="Chọn ngày tháng năm"
              aria-label="Chọn ngày tháng năm"
              className={`w-full h-full rounded-lg ${btnBg} flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs`}
            >
              <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-90 pointer-events-none" />
            </button>
            {/* Input type date được cô lập hoàn toàn, không phủ lên hay cản trở 2 nút mũi tên bên cạnh */}
            <input
              ref={datePickerRef}
              type="date"
              value={currentDate}
              onChange={(e) => {
                if (e.target.value) onSelectDate(e.target.value);
              }}
              tabIndex={-1}
              aria-hidden="true"
              className="absolute top-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
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
            <ChevronLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5 pointer-events-none" />
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
            <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5 pointer-events-none" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. CHỌN CHẾ ĐỘ: Ngày | Tuần | Tháng                           */}
      {/* ------------------------------------------------------------- */}
      <div className="flex space-x-1.5 mt-2">
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
