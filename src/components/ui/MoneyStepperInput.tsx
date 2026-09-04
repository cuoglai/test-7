import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MoneyStepperInputProps {
  id: string;
  label: string;
  value: number;
  step: number;
  stepLabel: string;
  onChange: (value: number) => void;
  min?: number;
  required?: boolean;
  error?: string;
  color?: 'blue' | 'green' | 'default';
  helperText?: string;
}

export const MoneyStepperInput: React.FC<MoneyStepperInputProps> = ({
  id,
  label,
  value,
  step,
  stepLabel,
  onChange,
  min = 0,
  required = false,
  error,
  color = 'default',
  helperText
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [textValue, setTextValue] = useState(value.toString());

  // Keep textValue in sync with value when not focused
  useEffect(() => {
    if (!isFocused) {
      setTextValue(value === 0 ? '0' : value.toString());
    }
  }, [value, isFocused]);

  const handleDecrease = () => {
    const nextVal = Math.max(min, value - step);
    onChange(nextVal);
    setTextValue(nextVal === 0 ? '0' : nextVal.toString());
  };

  const handleIncrease = () => {
    const nextVal = value + step;
    onChange(nextVal);
    setTextValue(nextVal.toString());
  };

  const handleFocus = () => {
    setIsFocused(true);
    setTextValue(value === 0 ? '' : value.toString());
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    setTextValue(digits);
    const num = digits === '' ? 0 : parseInt(digits, 10);
    onChange(Math.max(min, num));
  };

  const handleBlur = () => {
    setIsFocused(false);
    const num = textValue === '' ? 0 : parseInt(textValue, 10);
    onChange(Math.max(min, num));
  };

  // Formatted string with Vietnamese thousands separator
  const formattedDisplay = isFocused
    ? (textValue === '' ? '' : new Intl.NumberFormat('vi-VN').format(parseInt(textValue, 10)))
    : (value === 0 ? '0' : new Intl.NumberFormat('vi-VN').format(value));

  const colorTextClass =
    color === 'green'
      ? 'text-[#34C759]'
      : color === 'blue'
      ? 'text-[#007AFF]'
      : 'text-[#1C1C1E]';

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label htmlFor={id} className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
          {label} {required && <span className="text-[#FF3B30]">*</span>}
        </label>
        <span className="text-[10px] font-semibold text-[#8E8E93] bg-[#E5E5EA]/70 px-2 py-0.5 rounded-md">
          {stepLabel}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Decrease button */}
        <button
          id={`${id}-decrease-btn`}
          type="button"
          onClick={handleDecrease}
          disabled={value <= min}
          title={`Giảm ${stepLabel}`}
          aria-label={`Giảm ${stepLabel}`}
          className="h-12 w-12 sm:w-14 rounded-xl bg-white border border-[#E5E5EA] flex items-center justify-center text-[#1C1C1E] active:scale-95 active:bg-[#E5E5EA] hover:bg-[#F2F2F7] disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs shrink-0 cursor-pointer"
        >
          <ChevronDown className="w-5 h-5 stroke-[2.5] text-[#3A3A3C]" />
        </button>

        {/* Number Input */}
        <div className="relative flex-1">
          <input
            id={id}
            type="text"
            inputMode="numeric"
            value={formattedDisplay}
            onFocus={handleFocus}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="0"
            className={`w-full h-12 pl-3.5 pr-8 text-right rounded-xl bg-white border ${
              error ? 'border-[#FF3B30] focus:ring-[#FF3B30]' : 'border-[#E5E5EA] focus:ring-[#007AFF]'
            } text-[16px] sm:text-[17px] font-extrabold ${colorTextClass} focus:outline-none focus:border-[#007AFF] focus:ring-1 transition-all shadow-xs`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#8E8E93] pointer-events-none select-none">
            đ
          </span>
        </div>

        {/* Increase button */}
        <button
          id={`${id}-increase-btn`}
          type="button"
          onClick={handleIncrease}
          title={`Tăng ${stepLabel}`}
          aria-label={`Tăng ${stepLabel}`}
          className="h-12 w-12 sm:w-14 rounded-xl bg-white border border-[#E5E5EA] flex items-center justify-center text-[#1C1C1E] active:scale-95 active:bg-[#E5E5EA] hover:bg-[#F2F2F7] transition-all shadow-xs shrink-0 cursor-pointer"
        >
          <ChevronUp className="w-5 h-5 stroke-[2.5] text-[#3A3A3C]" />
        </button>
      </div>

      {helperText && !error && (
        <p className="text-[11px] text-[#8E8E93]">{helperText}</p>
      )}

      {error && (
        <p className="text-[11px] text-[#FF3B30] font-medium">{error}</p>
      )}
    </div>
  );
};
