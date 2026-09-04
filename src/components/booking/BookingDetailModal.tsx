import React, { useState } from 'react';
import { Booking } from '../../types';
import { getReminderLabel, getStatusBadgeInfo, getBookingDisplayTitle, getBookingMakeupInfo, formatDate, formatKCurrency } from '../../utils/formatters';
import { X, Phone, User, Calendar, Clock, CheckCircle, Edit3, Trash2, Bell, AlertTriangle, FileText, Copy, Check, Coins } from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useTheme } from '../../contexts/ThemeContext';

interface BookingDetailModalProps {
  booking: Booking | null;
  hasConflict?: boolean;
  onClose: () => void;
  onEdit: (booking: Booking) => void;
  onDelete: (id: string) => void;
  onMarkStatus: (id: string, status: Booking['status']) => void;
}

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  booking,
  hasConflict,
  onClose,
  onEdit,
  onDelete,
  onMarkStatus
}) => {
  const { isDark, accentConfig } = useTheme();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!booking) return null;

  const statusInfo = getStatusBadgeInfo(booking.status);
  const displayTitle = getBookingDisplayTitle(booking);
  const fullMakeupInfo = getBookingMakeupInfo(booking);

  // Detect phone if present in customerPhone or text
  const phoneMatch = fullMakeupInfo.match(/(?:0|\+84)[3|5|7|8|9][0-9]{8}\b/);
  const activePhone = booking.customerPhone || (phoneMatch ? phoneMatch[0] : null);

  const handleCopy = () => {
    navigator.clipboard.writeText(fullMakeupInfo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sheetBg = isDark ? 'bg-[#141416]' : 'bg-[#F2F2F7]';
  const cardBg = isDark ? 'bg-[#1C1C1E]' : 'bg-white';
  const cardBorder = isDark ? 'border-[#2C2C2E]' : 'border-[#E5E5EA]';
  const textPrimary = isDark ? 'text-white' : 'text-[#1C1C1E]';
  const textSecondary = isDark ? 'text-[#8E8E93]' : 'text-[#8E8E93]';
  const inputBg = isDark ? 'bg-[#2C2C2E]' : 'bg-[#F2F2F7]';

  return (
    <>
      <div
        id="booking-detail-backdrop"
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
        onClick={onClose}
      >
        <div
          id="booking-detail-sheet"
          style={{
            maxHeight: 'calc(100% - max(env(safe-area-inset-top, 0px), 44px) - 12px)',
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)'
          }}
          className={`${sheetBg} w-full sm:max-w-md rounded-t-[28px] sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden border ${cardBorder}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* iOS Pull Indicator / Grabber Handle */}
          <div className="w-full flex justify-center pt-2.5 pb-1 shrink-0">
            <div className="w-9 h-1 rounded-full bg-[#8E8E93]/40" />
          </div>

          {/* Header Bar */}
          <div className={`px-5 pt-1 pb-3 border-b ${cardBorder} flex justify-between items-center ${cardBg}`}>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusInfo.badgeClass}`}>
                {statusInfo.label}
              </span>
              {hasConflict && (
                <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FFF2F2] text-[#FF3B30] border border-[#FF3B30]">
                  <AlertTriangle className="w-3 h-3" /> Trùng lịch CTV
                </span>
              )}
            </div>
            <button
              id="close-detail-modal-btn"
              type="button"
              onClick={onClose}
              className={`w-8 h-8 rounded-full ${inputBg} flex items-center justify-center ${textPrimary} hover:opacity-80 active:scale-95 transition-all cursor-pointer`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5">
            {/* 1. Ngày & 2. Giờ Display Banner */}
            <div className={`${cardBg} p-3.5 rounded-2xl border ${cardBorder}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: accentConfig.hex }} />
                  <span className={`text-[18px] font-extrabold tracking-tight ${textPrimary}`}>
                    {booking.startTime} {booking.endTime ? `– ${booking.endTime}` : ''}
                  </span>
                </div>
                <div className={`flex items-center gap-1.5 text-[13px] font-semibold ${textSecondary}`}>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(booking.date)}</span>
                </div>
              </div>
            </div>

            {/* 3. Toàn bộ Thông tin lịch make */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className={`text-[11px] font-bold tracking-wider uppercase ${textSecondary} flex items-center gap-1.5`}>
                  <FileText className="w-3.5 h-3.5" style={{ color: accentConfig.hex }} />
                  Thông tin lịch make
                </p>
                <button
                  type="button"
                  onClick={handleCopy}
                  style={{ color: accentConfig.hex }}
                  className="text-[11px] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-[#34C759]" />
                      <span className="text-[#34C759]">Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>

              <div className={`p-4 rounded-2xl ${cardBg} border ${cardBorder} shadow-2xs`}>
                <p className={`text-[15px] ${textPrimary} leading-relaxed whitespace-pre-wrap font-normal select-text`}>
                  {fullMakeupInfo || 'Không có thông tin lịch'}
                </p>
              </div>

              {/* Quick Contact & Action Pills if phone found */}
              {activePhone && (
                <div className="pt-1">
                  <a
                    id="detail-call-link"
                    href={`tel:${activePhone}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/30 text-[13px] font-bold hover:bg-[#34C759]/20 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Gọi khách: {activePhone}
                  </a>
                </div>
              )}
            </div>

            {/* 4. Giá ca, Người make & 5. Thông báo */}
            <div className="grid grid-cols-3 gap-2">
              {/* Giá ca */}
              <div className={`p-2.5 ${cardBg} border ${cardBorder} rounded-xl`}>
                <p className={`text-[10px] ${textSecondary} uppercase font-bold tracking-wider mb-0.5 flex items-center gap-1`}>
                  <Coins className="w-3 h-3 text-[#34C759]" /> Giá ca
                </p>
                <p className="text-[14px] font-black text-[#34C759] font-mono truncate">
                  {formatKCurrency(booking.price || booking.totalAmount || 350000)}
                </p>
              </div>

              {/* Người make */}
              <div className={`p-2.5 ${cardBg} border ${cardBorder} rounded-xl`}>
                <p className={`text-[10px] ${textSecondary} uppercase font-bold tracking-wider mb-0.5 flex items-center gap-1`}>
                  <User className="w-3 h-3" /> Người make
                </p>
                <p className={`text-[13px] font-bold truncate ${
                  booking.performerType === 'ctv' ? 'text-[#5856D6]' : textPrimary
                }`}>
                  {booking.performerType === 'owner'
                    ? 'Tôi'
                    : `CTV ${booking.ctvNameSnapshot || ''}`}
                </p>
              </div>

              {/* Thông báo */}
              <div className={`p-2.5 ${cardBg} border ${cardBorder} rounded-xl`}>
                <p className={`text-[10px] ${textSecondary} uppercase font-bold tracking-wider mb-0.5 flex items-center gap-1`}>
                  <Bell className="w-3 h-3 text-[#FF9500]" /> Thông báo
                </p>
                <p className={`text-[13px] font-bold ${textPrimary} truncate`}>
                  {getReminderLabel(booking.reminder)}
                </p>
              </div>
            </div>

            {/* 6. Ghi chú */}
            <div className={`p-3.5 ${cardBg} border ${cardBorder} rounded-2xl`}>
              <p className={`text-[11px] font-bold tracking-wider uppercase ${textSecondary} mb-1`}>
                Ghi chú (lưu ý khác)
              </p>
              {booking.note ? (
                <p className={`text-[14px] ${textPrimary} whitespace-pre-wrap leading-relaxed`}>
                  {booking.note}
                </p>
              ) : (
                <p className={`text-[13px] ${textSecondary} italic`}>
                  Không có ghi chú thêm
                </p>
              )}
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className={`p-4 border-t ${cardBorder} ${cardBg} space-y-2`}>
            {/* Status toggle button */}
            {booking.status !== 'completed' ? (
              <button
                id="mark-completed-btn"
                type="button"
                onClick={() => {
                  onMarkStatus(booking.id, 'completed');
                  onClose();
                }}
                className="w-full py-3 px-3 rounded-xl bg-[#34C759] text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-xs hover:bg-[#2DB04E] active:scale-98 transition-all cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                Đánh dấu đã hoàn thành ca make
              </button>
            ) : (
              <button
                id="mark-active-btn"
                type="button"
                onClick={() => onMarkStatus(booking.id, 'deposited')}
                className={`w-full py-2.5 px-3 rounded-xl ${inputBg} ${textPrimary} font-semibold text-[13px] flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer`}
              >
                <CheckCircle className="w-4 h-4 text-[#34C759]" />
                Đã hoàn thành (Chạm để chuyển lại Đang lịch)
              </button>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                id="edit-booking-btn"
                type="button"
                onClick={() => {
                  onEdit(booking);
                  onClose();
                }}
                style={{ backgroundColor: accentConfig.hex }}
                className="flex-1 h-11 rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                <Edit3 className="w-4 h-4" />
                <span>Chỉnh sửa</span>
              </button>

              <button
                id="close-booking-btn"
                type="button"
                onClick={onClose}
                className={`flex-1 h-11 rounded-xl border ${cardBorder} ${inputBg} ${textPrimary} font-bold text-[14px] flex items-center justify-center gap-1.5 hover:opacity-85 active:scale-95 transition-all cursor-pointer shadow-2xs`}
              >
                <X className="w-4 h-4" />
                <span>Thoát</span>
              </button>

              <button
                id="delete-booking-btn"
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-[28%] sm:w-[30%] h-11 rounded-xl bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/30 font-bold text-[13px] sm:text-[14px] flex items-center justify-center gap-1 hover:bg-[#FF3B30]/20 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <span className="truncate">Xóa</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Xóa lịch Makeup?"
        message={`Bạn có chắc muốn xóa lịch "${displayTitle}" vào ngày ${booking.date}? Thao tác này không thể hoàn tác.`}
        confirmText="Xác nhận xóa"
        cancelText="Giữ lại"
        isDestructive={true}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onDelete(booking.id);
          onClose();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};
