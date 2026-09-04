import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Keyboard, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface IOSWheelTimePickerProps {
  value: string; // "HH:mm" (24h format)
  onChange: (newValue: string) => void;
  onClose?: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

const ITEM_HEIGHT = 40; // Height of each number row in px
const VISIBLE_HEIGHT = 200; // Total height of the wheel visible window
const PADDING_Y = (VISIBLE_HEIGHT - ITEM_HEIGHT) / 2; // 80px top & bottom spacer

export const IOSWheelTimePicker: React.FC<IOSWheelTimePickerProps> = ({
  value,
  onChange,
  onClose
}) => {
  const { isDark, accentConfig } = useTheme();
  const [currentHStr, currentMStr] = (value || '10:30').split(':');

  // Snap minute to nearest 5 for wheel display
  const rawMin = parseInt(currentMStr, 10) || 0;
  const snappedMinNum = Math.min(55, Math.max(0, Math.round(rawMin / 5) * 5));
  const currentSnapMStr = String(snappedMinNum).padStart(2, '0');

  const selectedHour = currentHStr || '10';
  const selectedMinute = currentSnapMStr;

  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<{ hour?: any; minute?: any }>({});

  const [showManualInput, setShowManualInput] = useState(false);
  const [manualHour, setManualHour] = useState(selectedHour);
  const [manualMinute, setManualMinute] = useState(selectedMinute);

  // Scroll column to target index smoothly or instantly
  const scrollToHour = useCallback((hourStr: string, smooth = true) => {
    const idx = HOURS.indexOf(hourStr);
    if (idx !== -1 && hourListRef.current) {
      hourListRef.current.scrollTo({
        top: idx * ITEM_HEIGHT,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }, []);

  const scrollToMinute = useCallback((minStr: string, smooth = true) => {
    const idx = MINUTES.indexOf(minStr);
    if (idx !== -1 && minuteListRef.current) {
      minuteListRef.current.scrollTo({
        top: idx * ITEM_HEIGHT,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }, []);

  // Initial scroll into view on mount without animation
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToHour(selectedHour, false);
      scrollToMinute(selectedMinute, false);
    }, 20);
    return () => clearTimeout(timer);
  }, []);

  // Handle Hour Scroll
  const handleHourScroll = () => {
    if (!hourListRef.current) return;
    clearTimeout(scrollTimeoutRef.current.hour);

    const scrollTop = hourListRef.current.scrollTop;
    const rawIdx = Math.round(scrollTop / ITEM_HEIGHT);
    const validIdx = Math.max(0, Math.min(HOURS.length - 1, rawIdx));
    const newHour = HOURS[validIdx];

    if (newHour && newHour !== selectedHour) {
      onChange(`${newHour}:${selectedMinute}`);
      setManualHour(newHour);
    }

    scrollTimeoutRef.current.hour = setTimeout(() => {
      if (hourListRef.current) {
        hourListRef.current.scrollTo({
          top: validIdx * ITEM_HEIGHT,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  // Handle Minute Scroll
  const handleMinuteScroll = () => {
    if (!minuteListRef.current) return;
    clearTimeout(scrollTimeoutRef.current.minute);

    const scrollTop = minuteListRef.current.scrollTop;
    const rawIdx = Math.round(scrollTop / ITEM_HEIGHT);
    const validIdx = Math.max(0, Math.min(MINUTES.length - 1, rawIdx));
    const newMin = MINUTES[validIdx];

    if (newMin && newMin !== selectedMinute) {
      onChange(`${selectedHour}:${newMin}`);
      setManualMinute(newMin);
    }

    scrollTimeoutRef.current.minute = setTimeout(() => {
      if (minuteListRef.current) {
        minuteListRef.current.scrollTo({
          top: validIdx * ITEM_HEIGHT,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  // Direct tap on hour item
  const handleSelectHourItem = (h: string) => {
    onChange(`${h}:${selectedMinute}`);
    setManualHour(h);
    scrollToHour(h, true);
  };

  // Direct tap on minute item
  const handleSelectMinuteItem = (m: string) => {
    onChange(`${selectedHour}:${m}`);
    setManualMinute(m);
    scrollToMinute(m, true);
  };

  // Apply manual input
  const handleApplyManual = () => {
    const validH = String(Math.max(0, Math.min(23, parseInt(manualHour, 10) || 0))).padStart(2, '0');
    const validM = String(Math.max(0, Math.min(59, parseInt(manualMinute, 10) || 0))).padStart(2, '0');
    onChange(`${validH}:${validM}`);
    scrollToHour(validH, true);
    
    // Snap to closest 5 min for wheel
    const roundM = Math.min(55, Math.max(0, Math.round(parseInt(validM, 10) / 5) * 5));
    scrollToMinute(String(roundM).padStart(2, '0'), true);
    setShowManualInput(false);
  };

  // Colors based on Light/Dark
  const containerBg = isDark ? 'bg-[#1C1C1E]' : 'bg-[#F2F2F7]';
  const borderCol = isDark ? 'border-[#38383A]' : 'border-[#E5E5EA]';
  const textPrimary = isDark ? 'text-white' : 'text-[#1C1C1E]';
  const textMuted = isDark ? 'text-white/35' : 'text-[#1C1C1E]/30';
  const centerPillBg = isDark ? 'bg-white/10 border-white/15' : 'bg-black/5 border-black/10';
  const fadeGradientFrom = isDark ? 'from-[#1C1C1E]' : 'from-[#F2F2F7]';

  return (
    <div
      id="ios-wheel-picker-wrapper"
      className={`${containerBg} rounded-2xl p-3 border ${borderCol} shadow-xs select-none`}
    >
      {/* Top action bar: Manual keyboard toggle & Done button */}
      <div className={`flex items-center justify-between pb-2 mb-1 border-b ${borderCol} px-1 text-[13px]`}>
        <button
          type="button"
          onClick={() => setShowManualInput(!showManualInput)}
          style={{ color: accentConfig.hex }}
          className="flex items-center gap-1 font-semibold transition-opacity hover:opacity-80 active:scale-95 cursor-pointer py-1"
        >
          <Keyboard className="w-3.5 h-3.5" />
          {showManualInput ? 'Dùng con lăn' : 'Nhập phím'}
        </button>

        <span className="text-[11px] font-bold uppercase tracking-wider opacity-50">
          Định dạng 24H
        </span>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{ color: accentConfig.hex }}
            className="font-bold hover:opacity-80 active:scale-95 transition-all cursor-pointer py-1 px-2 flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            Xong
          </button>
        )}
      </div>

      {showManualInput ? (
        /* Manual direct keyboard input */
        <div className="py-3 px-2 space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div className="text-center">
              <span className="text-[10px] opacity-60 font-bold block mb-1">GIỜ (00-23)</span>
              <input
                type="number"
                min={0}
                max={23}
                value={manualHour}
                onChange={(e) => setManualHour(e.target.value)}
                className={`w-16 h-12 rounded-xl text-center text-2xl font-black ${
                  isDark ? 'bg-black/30 border-white/20 text-white' : 'bg-white border-[#E5E5EA] text-[#1C1C1E]'
                } border focus:outline-none`}
                style={{ borderColor: accentConfig.hex }}
              />
            </div>
            <span className="text-2xl font-black opacity-40 pt-4">:</span>
            <div className="text-center">
              <span className="text-[10px] opacity-60 font-bold block mb-1">PHÚT (00-59)</span>
              <input
                type="number"
                min={0}
                max={59}
                value={manualMinute}
                onChange={(e) => setManualMinute(e.target.value)}
                className={`w-16 h-12 rounded-xl text-center text-2xl font-black ${
                  isDark ? 'bg-black/30 border-white/20 text-white' : 'bg-white border-[#E5E5EA] text-[#1C1C1E]'
                } border focus:outline-none`}
                style={{ borderColor: accentConfig.hex }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleApplyManual}
            style={{ backgroundColor: accentConfig.hex }}
            className="w-full h-11 rounded-xl text-white font-bold text-[14px] shadow-sm active:scale-98 transition-all cursor-pointer"
          >
            Áp dụng giờ này
          </button>
        </div>
      ) : (
        /* Strict iOS Vertical Wheel Picker */
        <div
          className="relative overflow-hidden w-full max-w-[280px] mx-auto"
          style={{ height: `${VISIBLE_HEIGHT}px` }}
        >
          {/* Center Selection Lens Pill */}
          <div
            className={`absolute left-2 right-2 rounded-xl pointer-events-none border ${centerPillBg}`}
            style={{
              top: `${PADDING_Y}px`,
              height: `${ITEM_HEIGHT}px`
            }}
          />

          {/* Top Fade Gradient Mask */}
          <div
            className={`absolute top-0 left-0 right-0 h-16 bg-gradient-to-b ${fadeGradientFrom} via-${fadeGradientFrom}/80 to-transparent pointer-events-none z-10`}
          />

          {/* Bottom Fade Gradient Mask */}
          <div
            className={`absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t ${fadeGradientFrom} via-${fadeGradientFrom}/80 to-transparent pointer-events-none z-10`}
          />

          {/* Two Perfectly Fixed Vertical Columns */}
          <div className="flex h-full w-full">
            {/* COLUMN 1: GIỜ (Strictly Vertical, no horizontal drift) */}
            <div
              ref={hourListRef}
              onScroll={handleHourScroll}
              className="w-1/2 h-full overflow-y-scroll overflow-x-hidden touch-pan-y no-scrollbar snap-y snap-mandatory text-center relative z-0"
              style={{
                paddingTop: `${PADDING_Y}px`,
                paddingBottom: `${PADDING_Y}px`
              }}
            >
              {HOURS.map((hour) => {
                const isSelected = hour === selectedHour;
                return (
                  <div
                    key={hour}
                    onClick={() => handleSelectHourItem(hour)}
                    className={`snap-center flex items-center justify-center cursor-pointer transition-all duration-100 ${
                      isSelected
                        ? `${textPrimary} text-[26px] font-black scale-105`
                        : `${textMuted} text-[18px] font-semibold hover:opacity-75`
                    }`}
                    style={{ height: `${ITEM_HEIGHT}px` }}
                  >
                    {hour}
                  </div>
                );
              })}
            </div>

            {/* Subtle Vertical Divider */}
            <div className="w-[1px] h-full bg-transparent flex items-center justify-center z-10 pointer-events-none">
              <span className={`text-[20px] font-black ${textMuted} -mt-1`}>:</span>
            </div>

            {/* COLUMN 2: PHÚT (Strictly Vertical, no horizontal drift) */}
            <div
              ref={minuteListRef}
              onScroll={handleMinuteScroll}
              className="w-1/2 h-full overflow-y-scroll overflow-x-hidden touch-pan-y no-scrollbar snap-y snap-mandatory text-center relative z-0"
              style={{
                paddingTop: `${PADDING_Y}px`,
                paddingBottom: `${PADDING_Y}px`
              }}
            >
              {MINUTES.map((min) => {
                const isSelected = min === selectedMinute;
                return (
                  <div
                    key={min}
                    onClick={() => handleSelectMinuteItem(min)}
                    className={`snap-center flex items-center justify-center cursor-pointer transition-all duration-100 ${
                      isSelected
                        ? `${textPrimary} text-[26px] font-black scale-105`
                        : `${textMuted} text-[18px] font-semibold hover:opacity-75`
                    }`}
                    style={{ height: `${ITEM_HEIGHT}px` }}
                  >
                    {min}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
