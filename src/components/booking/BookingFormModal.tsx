import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Booking, CTV, MakeupPackage, ReminderOption, PerformerType } from '../../types';
import { findCTVConflicts } from '../../services/conflictService';
import {
  getBookingDisplayTitle,
  getBookingMakeupInfo,
  calculateEndTimeFromDuration,
  formatDateString,
  timeToMinutes,
  formatCurrency,
  extractVietnamesePhoneNumber,
  parseBookingTemplate
} from '../../utils/formatters';
import { IOSWheelTimePicker } from './IOSWheelTimePicker';
import { InlineDatePicker } from './InlineDatePicker';
import { useTheme } from '../../contexts/ThemeContext';
import {
  X,
  Calendar,
  Clock,
  Sparkles,
  Bell,
  FileText,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Timer,
  Coins,
  Minus,
  Plus,
  Clipboard
} from 'lucide-react';

interface BookingFormModalProps {
  isOpen: boolean;
  initialDate?: string;
  editBooking?: Booking | null;
  packages?: MakeupPackage[];
  ctvs: CTV[];
  allBookings: Booking[];
  onClose: () => void;
  onSave: (booking: Booking) => void;
}

const REMINDER_CHOICES: { value: ReminderOption; label: string }[] = [
  { value: '15_mins', label: '15 phút' },
  { value: '30_mins', label: '30 phút' },
  { value: '1_hour', label: '1 giờ' },
  { value: '2_hours', label: '2 giờ' }
];

export const BookingFormModal: React.FC<BookingFormModalProps> = ({
  isOpen,
  initialDate,
  editBooking,
  ctvs,
  allBookings,
  onClose,
  onSave
}) => {
  const { isDark, accentConfig } = useTheme();

  // 1. Thông tin lịch make (ô note lớn, tự do nhiều dòng, mặc định trống ~4 dòng, tự động mở rộng theo nội dung)
  const [makeupInfo, setMakeupInfo] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    // Reset to auto first so scrollHeight shrinks when text is deleted
    el.style.height = 'auto';
    // Calculate border difference
    const borderAdjustment = el.offsetHeight - el.clientHeight;
    // Mặc định chiều cao tương đương ~4 dòng chữ (khoảng 110px)
    const newHeight = Math.max(el.scrollHeight + borderAdjustment, 110);
    el.style.height = `${newHeight}px`;
  }, []);

  // 2. Ngày
  const [date, setDate] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // 3. Giờ bắt đầu (24h format e.g. "10:30")
  const [startTime, setStartTime] = useState('10:30');
  const [isWheelPickerOpen, setIsWheelPickerOpen] = useState(false);

  // 4. Thời lượng ca (mặc định: 120 phút = 2 giờ)
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [isEditingDurationManual, setIsEditingDurationManual] = useState(false);
  const [manualDurationText, setManualDurationText] = useState('');
  const durationInputRef = useRef<HTMLInputElement>(null);

  // Xử lý nhập tay thời lượng khi bấm vào ô ở giữa
  const startManualDurationEdit = () => {
    const currentHours = durationMinutes / 60;
    setManualDurationText(
      Number.isInteger(currentHours)
        ? `${currentHours}`
        : `${currentHours.toString().replace('.', ',')}`
    );
    setIsEditingDurationManual(true);
    setTimeout(() => {
      durationInputRef.current?.focus();
      durationInputRef.current?.select();
    }, 50);
  };

  const handleSaveManualDuration = () => {
    setIsEditingDurationManual(false);
    const raw = manualDurationText.trim().toLowerCase();
    if (!raw) return;

    let mins = 0;
    if (raw.includes('p') || raw.includes('ph') || raw.includes('m')) {
      const parsed = parseInt(raw.replace(/\D/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0) mins = parsed;
    } else if (raw.includes('h')) {
      const hMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*h\s*(\d+)?/);
      if (hMatch) {
        const h = parseFloat(hMatch[1].replace(',', '.'));
        const m = hMatch[2] ? parseInt(hMatch[2], 10) : 0;
        mins = Math.round(h * 60 + m);
      }
    } else {
      const num = parseFloat(raw.replace(',', '.'));
      if (!isNaN(num) && num > 0) {
        if (num <= 12) {
          mins = Math.round(num * 60);
        } else {
          mins = Math.round(num);
        }
      }
    }

    if (mins >= 15 && mins <= 1440) {
      setDurationMinutes(mins);
    }
  };

  // 5. Giá ca makeup (mặc định: 350.000đ)
  const [price, setPrice] = useState<number>(350000);
  const [priceInputText, setPriceInputText] = useState<string>('350.000đ');

  // 6. Người make: Tôi / CTV
  const [performerType, setPerformerType] = useState<PerformerType>('owner');
  const [ctvId, setCtvId] = useState('');

  // 7. Thông báo trước (mặc định 30 phút)
  const [reminder, setReminder] = useState<ReminderOption>('30_mins');

  // 8. Ghi chú thêm
  const [note, setNote] = useState('');

  // Validation
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Tự động nhận diện số điện thoại (hỗ trợ cả các số bị phân tách thành cụm 3-4 số)
  const detectedPhone = useMemo(() => extractVietnamesePhoneNumber(makeupInfo), [makeupInfo]);

  const handleMakeupInfoChange = (val: string) => {
    setMakeupInfo(val);
    if (errors.makeupInfo) setErrors((prev) => ({ ...prev, makeupInfo: '' }));
    adjustTextareaHeight();

    // Tự động nhận diện thời gian & ngày nếu người dùng dán theo mẫu
    if (!editBooking) {
      const parsed = parseBookingTemplate(val);
      if (parsed.time) {
        setStartTime(parsed.time);
      }
      if (parsed.date) {
        setDate(parsed.date);
      }
    }
  };

  /**
   * Nút 'Dán' thông minh:
   * Lấy nội dung từ bộ nhớ tạm qua navigator.clipboard.readText()
   * Logic dán nối tiếp thông minh:
   * - Nếu ô nhập đang trống (hoặc con trỏ đang ở đầu dòng/dòng trống): Dán trực tiếp nội dung vào, không thêm khoảng trắng hay dòng thừa.
   * - Nếu ô nhập đã có chữ và chưa xuống dòng: Tự động chèn thêm một dấu xuống dòng (\n) rồi mới dán tiếp nội dung vừa copy vào.
   */
  const handleSmartPaste = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        alert('Trình duyệt chưa hỗ trợ tự động đọc bộ nhớ tạm. Bạn có thể nhấn giữ vào ô nhập để Dán.');
        return;
      }

      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) return;

      const textarea = textareaRef.current;
      let nextValue = '';
      let newCursorPos = 0;

      const isFocused = textarea && document.activeElement === textarea;
      const currentVal = makeupInfo;

      if (!currentVal || currentVal.trim() === '') {
        // Ô nhập đang trống -> Dán trực tiếp nội dung vào, không thêm khoảng trắng hay dòng thừa
        nextValue = clipboardText.trim();
        newCursorPos = nextValue.length;
      } else if (isFocused && textarea) {
        const start = textarea.selectionStart ?? currentVal.length;
        const end = textarea.selectionEnd ?? currentVal.length;
        const before = currentVal.substring(0, start);
        const after = currentVal.substring(end);

        // Kiểm tra con trỏ có đang ở đầu dòng hoặc dòng trống
        const isAtLineStart = start === 0 || before.endsWith('\n');

        if (isAtLineStart) {
          nextValue = before + clipboardText.trim() + after;
          newCursorPos = before.length + clipboardText.trim().length;
        } else {
          // Ô nhập đã có chữ và chưa xuống dòng -> tự động chèn thêm \n
          nextValue = before + '\n' + clipboardText.trim() + after;
          newCursorPos = before.length + 1 + clipboardText.trim().length;
        }
      } else {
        // Textarea không focus (thao tác bấm nút trực tiếp trên điện thoại hoặc desktop)
        if (currentVal.endsWith('\n')) {
          nextValue = currentVal + clipboardText.trim();
        } else {
          nextValue = currentVal + '\n' + clipboardText.trim();
        }
        newCursorPos = nextValue.length;
      }

      handleMakeupInfoChange(nextValue);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          adjustTextareaHeight();
        }
      }, 30);
    } catch (err: any) {
      console.warn('Lỗi khi đọc clipboard:', err);
      alert('Không thể đọc bộ nhớ tạm. Bạn có thể nhấn giữ vào ô để Dán.');
    }
  };

  const handleQuickPrice = (val: number) => {
    setPrice(val);
    setPriceInputText(formatCurrency(val));
  };

  const handlePriceChange = (valStr: string) => {
    setPriceInputText(valStr);
    const digits = valStr.replace(/\D/g, '');
    const num = parseInt(digits, 10);
    if (!isNaN(num)) {
      setPrice(num);
    } else {
      setPrice(0);
    }
  };

  const handlePriceBlur = () => {
    setPriceInputText(formatCurrency(price));
  };

  useEffect(() => {
    if (!isOpen) return;

    if (editBooking) {
      setMakeupInfo(editBooking.makeupInfo ?? getBookingMakeupInfo(editBooking));
      setDate(editBooking.date);
      const start = editBooking.startTime || '10:30';
      setStartTime(start);

      // Duration
      if (editBooking.startTime && editBooking.endTime) {
        let diff = timeToMinutes(editBooking.endTime) - timeToMinutes(editBooking.startTime);
        if (diff <= 0) diff += 1440;
        // Match closest option or keep
        setDurationMinutes(diff > 0 ? diff : 120);
      } else {
        setDurationMinutes(120);
      }

      // Price
      const bookingPrice =
        editBooking.price ??
        (editBooking.totalAmount > 0
          ? editBooking.totalAmount
          : editBooking.packagePrice > 0
          ? editBooking.packagePrice
          : 350000);
      setPrice(bookingPrice);
      setPriceInputText(formatCurrency(bookingPrice));

      setPerformerType(editBooking.performerType || 'owner');
      setCtvId(editBooking.ctvId || ctvs[0]?.id || '');
      setReminder(editBooking.reminder || '30_mins');
      setNote(editBooking.note || '');
    } else {
      setMakeupInfo('');
      const todayStr = initialDate || formatDateString(new Date());
      setDate(todayStr);
      setStartTime('10:30');
      setDurationMinutes(120); // Default 2 hours
      setPrice(350000);
      setPriceInputText('350.000đ');
      setPerformerType('owner');
      setCtvId(ctvs[0]?.id || '');
      setReminder('30_mins');
      setNote('');
    }
    setIsWheelPickerOpen(false);
    setErrors({});
  }, [isOpen, editBooking, initialDate, ctvs]);

  // Tự động mở rộng chiều cao theo toàn bộ nội dung khi mở modal hoặc thay đổi nội dung
  useEffect(() => {
    if (isOpen) {
      adjustTextareaHeight();
      const raf = requestAnimationFrame(() => {
        adjustTextareaHeight();
      });
      const timer = setTimeout(() => {
        adjustTextareaHeight();
      }, 50);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    }
  }, [isOpen, makeupInfo, adjustTextareaHeight]);

  // 5. Giờ kết thúc tự động tính: Giờ bắt đầu + Thời lượng ca
  const endCalculation = useMemo(() => {
    return calculateEndTimeFromDuration(startTime, durationMinutes);
  }, [startTime, durationMinutes]);

  // Conflict check for CTV
  const conflicts = findCTVConflicts(allBookings, {
    id: editBooking?.id,
    date,
    startTime,
    endTime: endCalculation.endTime,
    performerType,
    ctvId
  });

  const selectedCTV = ctvs.find((c) => c.id === ctvId) || ctvs[0];

  // Quick date chips
  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setDate(formatDateString(d));
    if (errors.date) setErrors((prev) => ({ ...prev, date: '' }));
  };

  // Friendly date label
  const formattedDateLabel = useMemo(() => {
    if (!date) return 'Chọn ngày';
    const today = formatDateString(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDateString(tomorrow);

    if (date === today) return 'Hôm nay';
    if (date === tomorrowStr) return 'Ngày mai';

    const [y, m, d] = date.split('-');
    return `${d}/${m}/${y}`;
  }, [date]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!makeupInfo.trim()) {
      newErrors.makeupInfo = 'Vui lòng nhập thông tin khách / lịch make.';
    }
    if (!date) {
      newErrors.date = 'Vui lòng chọn ngày makeup.';
    }
    if (!startTime) {
      newErrors.startTime = 'Vui lòng chọn giờ bắt đầu.';
    }
    if (performerType === 'ctv' && !ctvId && ctvs.length > 0) {
      newErrors.ctvId = 'Vui lòng chọn CTV thực hiện.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const displayTitle = getBookingDisplayTitle({ makeupInfo } as any);
    const parsedTemplate = parseBookingTemplate(makeupInfo);
    const customerPhone = parsedTemplate.phone || extractVietnamesePhoneNumber(makeupInfo) || editBooking?.customerPhone || '';
    const customerAddress = parsedTemplate.address || editBooking?.customerAddress || '';
    const quantity = parsedTemplate.quantity || editBooking?.quantity || 1;

    const bookingData: Booking = {
      id: editBooking?.id || 'b-' + Date.now().toString(36),
      customerId: editBooking?.customerId,

      date,
      startTime,
      endTime: endCalculation.endTime,

      makeupInfo: makeupInfo.trim(),
      customerName: displayTitle || parsedTemplate.name || editBooking?.customerName || 'Khách makeup',
      customerPhone,
      customerAddress,
      quantity,

      packageId: editBooking?.packageId || '',
      packageNameSnapshot: editBooking?.packageNameSnapshot || 'Makeup',
      price,
      packagePrice: price,
      deposit: 0,
      surcharge: 0,
      totalAmount: price,
      remainingAmount: 0,

      performerType,
      ctvId: performerType === 'ctv' ? (ctvId || selectedCTV?.id) : undefined,
      ctvNameSnapshot: performerType === 'ctv' ? (selectedCTV?.name || 'CTV') : undefined,

      reminder,
      note: note.trim(),
      status: editBooking?.status || (performerType === 'ctv' ? 'assigned' : 'deposited'),

      createdAt: editBooking?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    onSave(bookingData);
    onClose();
  };

  if (!isOpen) return null;

  // Unified theme tokens
  const sheetBg = isDark ? 'bg-[#141416]' : 'bg-[#F2F2F7]';
  const cardBg = isDark ? 'bg-[#1C1C1E]' : 'bg-white';
  const cardBorder = isDark ? 'border-[#2C2C2E]' : 'border-[#E5E5EA]';
  const textPrimary = isDark ? 'text-white' : 'text-[#1C1C1E]';
  const textSecondary = isDark ? 'text-[#8E8E93]' : 'text-[#636366]';
  const inputBg = isDark ? 'bg-[#2C2C2E]' : 'bg-[#F2F2F7]';
  const dividerCol = isDark ? 'divide-[#2C2C2E]' : 'divide-[#E5E5EA]';

  return (
    <div
      id="booking-form-backdrop"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        id="booking-form-sheet"
        style={{
          maxHeight: 'calc(100% - max(env(safe-area-inset-top, 0px), 44px) - 12px)'
        }}
        className={`${sheetBg} w-full sm:max-w-lg rounded-t-[28px] sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden border ${cardBorder}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Pull Indicator / Grabber Handle */}
        <div className="w-full flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-[#8E8E93]/40" />
        </div>

        {/* Header */}
        <div className={`px-5 pt-1 pb-3 border-b ${cardBorder} flex justify-between items-center ${cardBg} shrink-0`}>
          <div>
            <h2 className={`text-[17px] font-bold ${textPrimary}`}>
              {editBooking ? 'Chỉnh sửa lịch Makeup' : 'Tạo lịch mới'}
            </h2>
            <p className={`text-[12px] ${textSecondary}`}>Đặt lịch makeup nhanh và tự động</p>
          </div>
          <button
            id="close-booking-form-btn"
            type="button"
            onClick={onClose}
            className={`w-9 h-9 rounded-full ${inputBg} flex items-center justify-center ${textPrimary} hover:opacity-80 active:scale-95 transition-all cursor-pointer`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body: Exact sequence requested by user */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5">

          {/* ============================================================ */}
          {/* 1. THÔNG TIN LỊCH MAKE (Đưa lên đầu tiên ngay dưới tiêu đề)   */}
          {/* ============================================================ */}
          <div className={`${cardBg} px-3.5 py-2.5 rounded-xl border ${cardBorder} shadow-xs space-y-1.5`}>
            <div className="flex justify-between items-center">
              <label
                htmlFor="booking-input-makeup-info"
                className={`text-[13px] font-bold ${textSecondary} flex items-center gap-1.5`}
              >
                <FileText className="w-4 h-4" style={{ color: accentConfig.hex }} />
                Thông tin lịch make <span className="text-[#FF3B30]">*</span>
              </label>
            </div>

            <div className="relative">
              <textarea
                ref={textareaRef}
                id="booking-input-makeup-info"
                rows={3}
                value={makeupInfo}
                onChange={(e) => handleMakeupInfoChange(e.target.value)}
                placeholder=""
                className={`w-full p-2.5 pb-8 rounded-xl ${inputBg} border border-transparent focus:outline-none text-[14.5px] ${textPrimary} leading-relaxed min-h-[90px] resize-none overflow-hidden`}
                style={{
                  borderColor: errors.makeupInfo ? '#FF3B30' : undefined
                }}
              />
              {/* Nút 'Dán' thông minh ở góc dưới bên phải bên trong khung nhập nội dung */}
              <button
                type="button"
                id="btn-smart-paste-makeup-info"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleSmartPaste}
                title="Dán từ bộ nhớ tạm"
                className={`absolute right-2 bottom-2 h-6 px-2.5 rounded-md border text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95 z-10 select-none touch-manipulation ${
                  isDark
                    ? 'bg-[#3A3A3C] hover:bg-[#48484A] border-[#48484A] text-white'
                    : 'bg-white hover:bg-[#F2F2F7] border-[#D1D1D6] text-[#1C1C1E]'
                }`}
              >
                <Clipboard className="w-3 h-3" style={{ color: accentConfig.hex }} />
                <span>Dán</span>
              </button>
            </div>
            {detectedPhone && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#34C759] font-semibold bg-[#34C759]/10 px-2 py-0.5 rounded-md w-fit">
                <Check className="w-3 h-3 stroke-[2.5]" />
                <span>Đã nhận diện SĐT: <strong className="font-mono">{detectedPhone}</strong></span>
              </div>
            )}
            {errors.makeupInfo && (
              <p className="text-[11px] text-[#FF3B30] font-medium">{errors.makeupInfo}</p>
            )}
          </div>

          {/* ============================================================ */}
          {/* 2 & 3. NGÀY VÀ GIỜ BẮT ĐẦU                                  */}
          {/* ============================================================ */}
          <div className={`${cardBg} rounded-xl border ${cardBorder} shadow-xs divide-y ${dividerCol} overflow-hidden`}>
            
            {/* Row 2: Ngày Makeup (Bấm mở Bảng chọn ngày) */}
            <div className="px-3.5 py-2.5">
              <div
                id="btn-toggle-date-picker"
                onClick={() => {
                  setIsDatePickerOpen(!isDatePickerOpen);
                  if (!isDatePickerOpen) setIsWheelPickerOpen(false);
                }}
                className="flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: accentConfig.lightBg, color: accentConfig.hex }}
                  >
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className={`text-[13px] font-bold ${textPrimary} block leading-tight`}>
                      Ngày makeup
                    </span>
                    <span className="text-[13px] font-semibold" style={{ color: accentConfig.hex }}>
                      {formattedDateLabel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Quick shortcut chips */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setQuickDate(0)}
                      className={`text-[10.5px] font-semibold px-2 h-6.5 rounded-md ${inputBg} ${textPrimary} border ${cardBorder} active:scale-95 transition-all`}
                    >
                      Hôm nay
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(1)}
                      className={`text-[10.5px] font-semibold px-2 h-6.5 rounded-md ${inputBg} ${textPrimary} border ${cardBorder} active:scale-95 transition-all`}
                    >
                      Ngày mai
                    </button>
                  </div>

                  {isDatePickerOpen ? (
                    <ChevronUp className={`w-4 h-4 ${textSecondary}`} />
                  ) : (
                    <ChevronDown className={`w-4 h-4 ${textSecondary}`} />
                  )}
                </div>
              </div>

              {/* Bảng chọn ngày (Inline Date Picker trực quan) */}
              {isDatePickerOpen && (
                <div className="mt-2.5 pt-2.5 border-t border-dashed" style={{ borderColor: isDark ? '#2C2C2E' : '#E5E5EA' }}>
                  <InlineDatePicker
                    value={date}
                    onChange={(newDate) => {
                      setDate(newDate);
                      if (errors.date) setErrors((prev) => ({ ...prev, date: '' }));
                    }}
                    onClose={() => setIsDatePickerOpen(false)}
                  />
                </div>
              )}
            </div>

            {/* Row 3: Giờ bắt đầu (Bấm để mở Wheel Picker) */}
            <div className="px-3.5 py-2.5">
              <div
                id="btn-toggle-time-picker"
                onClick={() => {
                  setIsWheelPickerOpen(!isWheelPickerOpen);
                  if (!isWheelPickerOpen) setIsDatePickerOpen(false);
                }}
                className="flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: accentConfig.lightBg, color: accentConfig.hex }}
                  >
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className={`text-[13px] font-bold ${textPrimary} block leading-tight`}>
                      Giờ bắt đầu
                    </span>
                    <span className={`text-[11px] ${textSecondary}`}>Định dạng 24 giờ</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="text-[18px] font-black tracking-tight px-2.5 py-0.5 rounded-lg font-mono"
                    style={{ backgroundColor: accentConfig.lightBg, color: accentConfig.hex }}
                  >
                    {startTime}
                  </span>
                  {isWheelPickerOpen ? (
                    <ChevronUp className={`w-4 h-4 ${textSecondary}`} />
                  ) : (
                    <ChevronDown className={`w-4 h-4 ${textSecondary}`} />
                  )}
                </div>
              </div>

              {/* iPhone Wheel Picker (Cố định, không lệch) */}
              {isWheelPickerOpen && (
                <div className="mt-2.5 pt-2.5 border-t border-dashed" style={{ borderColor: isDark ? '#2C2C2E' : '#E5E5EA' }}>
                  <IOSWheelTimePicker
                    value={startTime}
                    onChange={(newTime) => {
                      setStartTime(newTime);
                      if (errors.startTime) setErrors((prev) => ({ ...prev, startTime: '' }));
                    }}
                    onClose={() => setIsWheelPickerOpen(false)}
                  />
                </div>
              )}
            </div>
          </div>
          {errors.date && <p className="text-[11px] text-[#FF3B30] font-medium px-1">{errors.date}</p>}
          {errors.startTime && <p className="text-[11px] text-[#FF3B30] font-medium px-1">{errors.startTime}</p>}

          {/* ============================================================ */}
          {/* 4. THỜI LƯỢNG CA VÀ GIỜ KẾT THÚC (Thu nhỏ 50%, các dòng sát nhau) */}
          {/* ============================================================ */}
          <div className={`${cardBg} px-3 py-2 rounded-xl border ${cardBorder} shadow-xs space-y-1.5`}>
            {/* Hàng trên: Nhãn thời lượng nhỏ gọn bên trái & Giờ kết thúc tự tính bên phải */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 shrink-0">
                <Timer className="w-3.5 h-3.5" style={{ color: accentConfig.hex }} />
                <span className={`text-[11px] font-bold uppercase tracking-wider ${textSecondary}`}>
                  Thời lượng
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 text-right">
                <span className={`text-[11px] ${textSecondary}`}>Kết thúc:</span>
                <span className="font-bold text-[#34C759] font-mono text-[12px] px-1.5 py-0.5 rounded-md bg-[#34C759]/10">
                  {endCalculation.displayFormatted}
                </span>
                {endCalculation.isNextDay && (
                  <span className="text-[9px] font-bold text-[#FF9500]">(+1 ngày)</span>
                )}
              </div>
            </div>

            {/* Hàng dưới: 3 nút [-] [ 2h (120p) ] [+] thu gọn 50% chiều cao, h-8 */}
            <div className="grid grid-cols-3 gap-1.5 items-center">
              {/* Nút Giảm -0.5h */}
              <button
                id="btn-duration-decrease"
                type="button"
                onClick={() => setDurationMinutes((prev) => Math.max(30, prev - 30))}
                disabled={durationMinutes <= 30}
                aria-label="Giảm 0.5 giờ"
                className={`h-8 rounded-lg font-bold transition-all flex items-center justify-center cursor-pointer border ${cardBorder} ${inputBg} ${textPrimary} hover:opacity-80 active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-2xs`}
              >
                <Minus className="w-4 h-4 stroke-[2.5]" />
              </button>

              {/* Ô số ở giữa: Bấm vào để nhập tay số giờ hoặc phút */}
              {isEditingDurationManual ? (
                <div
                  style={{
                    backgroundColor: accentConfig.lightBg,
                    borderColor: accentConfig.hex
                  }}
                  className="h-8 rounded-lg border-2 flex items-center justify-center shadow-xs overflow-hidden px-1"
                >
                  <input
                    ref={durationInputRef}
                    type="text"
                    inputMode="decimal"
                    value={manualDurationText}
                    onChange={(e) => setManualDurationText(e.target.value)}
                    onBlur={handleSaveManualDuration}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveManualDuration();
                      } else if (e.key === 'Escape') {
                        setIsEditingDurationManual(false);
                      }
                    }}
                    placeholder="2h"
                    aria-label="Nhập tay thời lượng ca"
                    className="w-full text-center font-mono font-black text-[14px] bg-transparent focus:outline-none"
                    style={{ color: accentConfig.hex }}
                  />
                </div>
              ) : (
                <button
                  id="display-duration-value"
                  type="button"
                  onClick={startManualDurationEdit}
                  title="Bấm để nhập tay thời lượng"
                  style={{
                    backgroundColor: accentConfig.lightBg,
                    borderColor: accentConfig.hex,
                    color: accentConfig.hex
                  }}
                  className="h-8 rounded-lg border flex items-center justify-center gap-1 select-none shadow-2xs cursor-pointer hover:opacity-90 active:scale-98 transition-all px-1"
                >
                  <span className="text-[14px] font-black tracking-tight leading-none">
                    {Number.isInteger(durationMinutes / 60)
                      ? `${durationMinutes / 60}h`
                      : `${(durationMinutes / 60).toString().replace('.', ',')}h`}
                  </span>
                  <span className="text-[10px] opacity-75 font-semibold leading-none">
                    ({durationMinutes}p)
                  </span>
                </button>
              )}

              {/* Nút Tăng +0.5h */}
              <button
                id="btn-duration-increase"
                type="button"
                onClick={() => setDurationMinutes((prev) => Math.min(720, prev + 30))}
                disabled={durationMinutes >= 720}
                aria-label="Tăng 0.5 giờ"
                className={`h-8 rounded-lg font-bold transition-all flex items-center justify-center cursor-pointer border ${cardBorder} ${inputBg} ${textPrimary} hover:opacity-80 active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-2xs`}
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 5. GIÁ CA MAKEUP (Thu nhỏ khung ô nhập + Trả lại nút 100k, 300k, 500k) */}
          {/* ============================================================ */}
          <div className={`${cardBg} px-3 py-2 rounded-xl border ${cardBorder} shadow-xs space-y-1.5`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: accentConfig.lightBg, color: accentConfig.hex }}
                >
                  <Coins className="w-4 h-4" />
                </div>
                <span className={`text-[14px] font-bold ${textPrimary} truncate`}>
                  Giá ca makeup
                </span>
              </div>

              {/* Khung ô nhập giá tiền thu nhỏ gọn gàng, vừa vặn với kích cỡ chữ */}
              <div className="relative shrink-0">
                <input
                  id="booking-input-price"
                  type="text"
                  inputMode="numeric"
                  value={priceInputText}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  onFocus={() => {
                    if (price > 0) setPriceInputText(new Intl.NumberFormat('vi-VN').format(price));
                  }}
                  onBlur={handlePriceBlur}
                  placeholder="0đ"
                  aria-label="Giá ca makeup"
                  className={`w-32 sm:w-36 text-right font-mono font-black text-[18px] sm:text-[19px] px-2.5 py-1 rounded-lg border-2 ${cardBorder} ${inputBg} focus:outline-none focus:border-[#34C759] shadow-2xs transition-all`}
                  style={{
                    color: '#34C759'
                  }}
                />
              </div>
            </div>

            {/* Hàng nút chọn nhanh giá: 100.000, 300.000, 500.000 trả lại theo yêu cầu */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className={`text-[11px] font-semibold ${textSecondary} shrink-0`}>
                Nhanh:
              </span>
              <div className="flex items-center gap-1.5 flex-1">
                {[100000, 300000, 500000].map((presetVal) => {
                  const isCurrent = price === presetVal;
                  return (
                    <button
                      key={presetVal}
                      type="button"
                      onClick={() => {
                        setPrice(presetVal);
                        setPriceInputText(`${new Intl.NumberFormat('vi-VN').format(presetVal)}đ`);
                      }}
                      className={`flex-1 h-7 px-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center ${
                        isCurrent
                          ? 'bg-[#34C759] text-white border-[#34C759] shadow-2xs'
                          : `${inputBg} ${textPrimary} ${cardBorder} hover:opacity-80 active:scale-95`
                      }`}
                    >
                      {new Intl.NumberFormat('vi-VN').format(presetVal)}đ
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 6. NGƯỜI MAKE: TÔI / CTV (Gọn gàng)                          */}
          {/* ============================================================ */}
          <div className={`${cardBg} px-3.5 py-2 rounded-xl border ${cardBorder} shadow-xs space-y-1.5`}>
            <span className={`text-[12px] font-bold ${textSecondary} block`}>
              Người make
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                id="performer-owner-btn"
                type="button"
                onClick={() => setPerformerType('owner')}
                style={
                  performerType === 'owner'
                    ? { backgroundColor: accentConfig.hex, color: '#FFFFFF' }
                    : undefined
                }
                className={`h-9 rounded-lg text-[13px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  performerType === 'owner'
                    ? 'shadow-xs scale-[1.01]'
                    : `${inputBg} ${textSecondary} hover:${textPrimary} border ${cardBorder}`
                }`}
              >
                <span>👑</span>
                <span>Tôi</span>
              </button>

              <button
                id="performer-ctv-btn"
                type="button"
                onClick={() => setPerformerType('ctv')}
                className={`h-9 rounded-lg text-[13px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  performerType === 'ctv'
                    ? 'bg-[#5856D6] text-white shadow-xs scale-[1.01]'
                    : `${inputBg} ${textSecondary} hover:${textPrimary} border ${cardBorder}`
                }`}
              >
                <span>🤝</span>
                <span>CTV</span>
              </button>
            </div>

            {/* Cảnh báo trùng giờ khi xếp lịch cho 'Tôi' */}
            {performerType === 'owner' && conflicts.length > 0 && (
              <div className="pt-2 border-t border-[#FF3B30]/20">
                <div className="p-2 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#FF3B30] shrink-0" />
                  <p className="text-[11px] text-[#FF3B30] font-medium leading-tight">
                    Bạn đang có lịch trùng lúc {conflicts[0].overlapStart} – {conflicts[0].overlapEnd}!
                  </p>
                </div>
              </div>
            )}

            {/* Chọn CTV khi chọn mục CTV */}
            {performerType === 'ctv' && (
              <div className={`pt-2 border-t ${cardBorder} space-y-1.5`}>
                <label className={`block text-[11px] font-bold ${textSecondary}`}>
                  Chọn CTV thực hiện
                </label>
                <select
                  id="booking-select-ctv"
                  value={ctvId}
                  onChange={(e) => setCtvId(e.target.value)}
                  className={`w-full h-10 px-3 rounded-lg ${inputBg} border ${cardBorder} text-[13.5px] font-semibold ${textPrimary} focus:outline-none`}
                >
                  {ctvs.map((ctv) => (
                    <option key={ctv.id} value={ctv.id}>
                      {ctv.name} ({ctv.phone})
                    </option>
                  ))}
                </select>

                {conflicts.length > 0 && (
                  <div className="p-2 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#FF3B30] shrink-0" />
                    <p className="text-[11px] text-[#FF3B30] font-medium leading-tight">
                      CTV {selectedCTV?.name} đang có lịch trùng lúc {conflicts[0].overlapStart} – {conflicts[0].overlapEnd}!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* 7. THÔNG BÁO TRƯỚC (Bỏ 1 ngày, thu gọn kích thước)          */}
          {/* ============================================================ */}
          <div className={`${cardBg} px-3.5 py-2 rounded-xl border ${cardBorder} shadow-xs space-y-1.5`}>
            <div className="flex justify-between items-center">
              <span className={`text-[12px] font-bold ${textSecondary} flex items-center gap-1.5`}>
                <Bell className="w-3.5 h-3.5" style={{ color: accentConfig.hex }} />
                Thông báo trước
              </span>
              <span className={`text-[10.5px] ${textSecondary}`}>Mặc định 30 phút</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {REMINDER_CHOICES.map((choice) => {
                const isSelected = reminder === choice.value;
                return (
                  <button
                    key={choice.value}
                    id={`reminder-option-${choice.value}`}
                    type="button"
                    onClick={() => setReminder(choice.value)}
                    style={
                      isSelected
                        ? { backgroundColor: accentConfig.hex, color: '#FFFFFF' }
                        : undefined
                    }
                    className={`h-7.5 px-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'shadow-2xs'
                        : `${inputBg} ${textPrimary} border ${cardBorder} hover:opacity-80 active:scale-95`
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3] shrink-0" />}
                    <span className="truncate">{choice.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ============================================================ */}
          {/* 8. GHI CHÚ THÊM (Thu gọn chiều cao)                          */}
          {/* ============================================================ */}
          <div className={`${cardBg} px-3.5 py-2 rounded-xl border ${cardBorder} shadow-xs space-y-1`}>
            <label
              htmlFor="booking-input-note"
              className={`block text-[12px] font-bold ${textSecondary}`}
            >
              Ghi chú thêm
            </label>
            <textarea
              id="booking-input-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: “Khách thích tông cam đào”, “Đến sớm 15 phút”…"
              className={`w-full p-2.5 rounded-lg ${inputBg} border border-transparent text-[13px] ${textPrimary} focus:outline-none resize-none transition-all placeholder:${textSecondary}/60`}
            />
          </div>

        </form>

        {/* ============================================================ */}
        {/* 9. NÚT "LƯU LỊCH MAKEUP" (Dưới cùng, to rõ, 1 chạm)         */}
        {/* ============================================================ */}
        <div
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}
          className={`p-4 border-t ${cardBorder} ${cardBg} shrink-0`}
        >
          <button
            id="save-booking-submit-btn"
            type="button"
            onClick={() => handleSubmit()}
            style={{ backgroundColor: accentConfig.hex }}
            className="w-full h-12 rounded-xl text-white font-extrabold text-[15px] shadow-md hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            LƯU LỊCH MAKEUP
          </button>
        </div>
      </div>
    </div>
  );
};
