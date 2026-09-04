import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface InlineDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  onClose?: () => void;
}

const WEEKDAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const InlineDatePicker: React.FC<InlineDatePickerProps> = ({
  value,
  onChange,
  onClose
}) => {
  const { isDark, accentConfig } = useTheme();

  // Parse initial selected date
  const [currentYear, currentMonth] = useMemo(() => {
    if (value) {
      const parts = value.split('-').map(Number);
      return [parts[0] || 2026, parts[1] || 9];
    }
    const now = new Date();
    return [now.getFullYear(), now.getMonth() + 1];
  }, [value]);

  const [viewYear, setViewYear] = useState<number>(currentYear);
  const [viewMonth, setViewMonth] = useState<number>(currentMonth);

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth, 0).getDate();
  }, [viewYear, viewMonth]);

  const firstDayOffset = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();
    // Monday is 0, Sunday is 6
    return (firstDay + 6) % 7;
  }, [viewYear, viewMonth]);

  const handleSelectDay = (dayNum: number) => {
    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    onChange(dateStr);
    if (onClose) onClose();
  };

  const handleQuickSelect = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth() + 1);
    onChange(dateStr);
    if (onClose) onClose();
  };

  const cardBorder = isDark ? 'border-[#2C2C2E]' : 'border-[#E5E5EA]';
  const textPrimary = isDark ? 'text-white' : 'text-[#1C1C1E]';
  const textSecondary = isDark ? 'text-[#8E8E93]' : 'text-[#636366]';
  const inputBg = isDark ? 'bg-[#2C2C2E]' : 'bg-[#F2F2F7]';

  return (
    <div className="w-full select-none pt-2 pb-1">
      {/* Month Stepper Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={handlePrevMonth}
          title="Tháng trước"
          className={`w-7 h-7 rounded-lg ${inputBg} flex items-center justify-center ${textPrimary} hover:opacity-80 active:scale-95 transition-all cursor-pointer border ${cardBorder}`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-center">
          <span className={`text-[13px] font-bold ${textPrimary}`}>
            Tháng {String(viewMonth).padStart(2, '0')}/{viewYear}
          </span>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          title="Tháng sau"
          className={`w-7 h-7 rounded-lg ${inputBg} flex items-center justify-center ${textPrimary} hover:opacity-80 active:scale-95 transition-all cursor-pointer border ${cardBorder}`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekdays header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAY_NAMES.map((w, idx) => (
          <div
            key={w}
            className={`text-[10px] font-bold py-0.5 ${
              idx >= 5 ? 'text-[#FF9500]' : textSecondary
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty slots for offset */}
        {Array.from({ length: firstDayOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8 rounded-lg opacity-0 pointer-events-none" />
        ))}

        {/* Days 1..daysInMonth */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const isSelected = value === dateStr;
          const isToday = todayStr === dateStr;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => handleSelectDay(dayNum)}
              style={
                isSelected
                  ? { backgroundColor: accentConfig.hex, color: '#FFFFFF' }
                  : undefined
              }
              className={`h-8 rounded-lg text-[12px] font-bold transition-all cursor-pointer flex items-center justify-center relative ${
                isSelected
                  ? 'shadow-xs font-black'
                  : isToday
                  ? `border ${inputBg} font-black text-[#FF9500]`
                  : `${textPrimary} hover:${inputBg} active:scale-95`
              }`}
            >
              {dayNum}
              {isToday && !isSelected && (
                <span
                  className="w-1 h-1 rounded-full absolute bottom-1"
                  style={{ backgroundColor: accentConfig.hex }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Quick shortcuts */}
      <div className="flex items-center justify-between gap-1.5 mt-2 pt-2 border-t border-dashed" style={{ borderColor: isDark ? '#2C2C2E' : '#E5E5EA' }}>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleQuickSelect(0)}
            className={`text-[11px] font-semibold px-2 py-1 rounded-md ${inputBg} ${textPrimary} border ${cardBorder} active:scale-95 transition-all`}
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect(1)}
            className={`text-[11px] font-semibold px-2 py-1 rounded-md ${inputBg} ${textPrimary} border ${cardBorder} active:scale-95 transition-all`}
          >
            Ngày mai
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect(2)}
            className={`text-[11px] font-semibold px-2 py-1 rounded-md ${inputBg} ${textPrimary} border ${cardBorder} active:scale-95 transition-all`}
          >
            Ngày kia
          </button>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{ color: accentConfig.hex }}
            className="text-[11px] font-bold hover:underline cursor-pointer flex items-center gap-0.5"
          >
            <Check className="w-3 h-3 stroke-[3]" /> Xong
          </button>
        )}
      </div>
    </div>
  );
};
