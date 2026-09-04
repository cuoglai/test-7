import React, { useState } from 'react';
import { CTV, Booking } from '../../types';
import { Phone, Plus, Edit2, Trash2, Calendar, X, ChevronLeft } from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { BookingCard } from '../booking/BookingCard';
import { useTheme } from '../../contexts/ThemeContext';

interface CTVListViewProps {
  ctvs: CTV[];
  bookings: Booking[];
  onSaveCTV: (ctv: CTV) => void;
  onDeleteCTV: (id: string) => void;
  onSelectBooking: (booking: Booking) => void;
  onBack?: () => void;
}

export const CTVListView: React.FC<CTVListViewProps> = ({
  ctvs,
  bookings,
  onSaveCTV,
  onDeleteCTV,
  onSelectBooking,
  onBack
}) => {
  const { isDark, accentConfig } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCTV, setEditingCTV] = useState<CTV | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewScheduleCTV, setViewScheduleCTV] = useState<CTV | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [active, setActive] = useState(true);

  const handleOpenAdd = () => {
    setEditingCTV(null);
    setName('');
    setPhone('');
    setNote('');
    setActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (c: CTV, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCTV(c);
    setName(c.name);
    setPhone(c.phone);
    setNote(c.note || '');
    setActive(c.active);
    setModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data: CTV = {
      id: editingCTV?.id || 'ctv-' + Date.now().toString(36),
      name: name.trim(),
      phone: phone.trim(),
      note: note.trim(),
      active
    };

    onSaveCTV(data);
    setModalOpen(false);
  };

  const viewBg = isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]';
  const cardBg = isDark ? 'bg-[#1C1C1E]' : 'bg-white';
  const cardBorder = isDark ? 'border-[#2C2C2E]' : 'border-[#E5E5EA]';
  const textPrimary = isDark ? 'text-white' : 'text-[#1C1C1E]';
  const textSecondary = isDark ? 'text-[#8E8E93]' : 'text-[#8E8E93]';
  const inputBg = isDark ? 'bg-[#2C2C2E]' : 'bg-[#F2F2F7]';

  return (
    <div id="ctv-list-root" className={`flex-1 flex flex-col overflow-hidden ${viewBg}`}>
      {/* Top Header */}
      <div
        className={`${cardBg} border-b ${cardBorder} shrink-0 select-none`}
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
          paddingBottom: '12px',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 20px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 20px)'
        }}
      >
        {onBack && (
          <div className="mb-2">
            <button
              id="ctv-back-to-settings-btn"
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 text-[13px] font-bold hover:underline cursor-pointer"
              style={{ color: accentConfig.hex }}
            >
              <ChevronLeft className="w-4 h-4" /> Cài đặt
            </button>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div>
            <h2 className={`text-xl font-bold ${textPrimary}`}>Danh sách CTV</h2>
            <p className={`text-[12px] ${textSecondary}`}>Quản lý cộng tác viên trang điểm</p>
          </div>
          <button
            id="add-ctv-top-btn"
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 rounded-full bg-[#5856D6] text-white text-[13px] font-bold shadow-xs hover:bg-[#4745B8] active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Thêm CTV
          </button>
        </div>
      </div>

      {/* CTV Cards List */}
      <div
        className="flex-1 overflow-y-auto ios-scrollable p-4 space-y-3"
        style={{
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 16px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 16px)',
          paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 12px) + 64px)'
        }}
      >
        {ctvs.map((ctv) => {
          const ctvBookings = bookings.filter(
            (b) => b.performerType === 'ctv' && b.ctvId === ctv.id && b.status !== 'cancelled'
          );

          return (
            <div
              key={ctv.id}
              id={`ctv-item-${ctv.id}`}
              onClick={() => setViewScheduleCTV(ctv)}
              className={`${cardBg} p-4 rounded-2xl border ${cardBorder} shadow-xs hover:shadow-md transition-all cursor-pointer`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-[16px] font-bold ${textPrimary}`}>{ctv.name}</h3>
                    {!ctv.active && (
                      <span className="text-[10px] bg-[#E5E5EA] text-[#8E8E93] px-2 py-0.5 rounded-full">
                        Tạm ngưng
                      </span>
                    )}
                  </div>
                  {ctv.phone && (
                    <a
                      href={`tel:${ctv.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[13px] text-[#007AFF] font-medium flex items-center gap-1 mt-0.5 hover:underline"
                    >
                      <Phone className="w-3 h-3" />
                      {ctv.phone}
                    </a>
                  )}
                </div>

                {/* Badge of total bookings */}
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full bg-[#5856D6]/10 text-[#5856D6] text-[12px] font-extrabold">
                    {ctvBookings.length} lịch
                  </span>
                </div>
              </div>

              {ctv.note && (
                <p className={`text-[12px] ${textSecondary} mt-2 line-clamp-2 leading-relaxed`}>
                  {ctv.note}
                </p>
              )}

              {/* Action row */}
              <div className={`mt-3 pt-2.5 border-t ${cardBorder} flex justify-between items-center text-[12px]`}>
                <span className="text-[#5856D6] font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Chạm xem lịch ({ctvBookings.length})
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={(e) => handleOpenEdit(ctv, e)}
                    className={`p-1.5 rounded-lg ${textSecondary} hover:${textPrimary} ${isDark ? 'hover:bg-[#2C2C2E]' : 'hover:bg-[#F2F2F7]'} cursor-pointer`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(ctv.id);
                    }}
                    className="p-1.5 rounded-lg text-[#FF3B30] hover:bg-[#FF3B30]/10 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal View CTV Schedule */}
      {viewScheduleCTV && (
        <div
          id="ctv-schedule-modal"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setViewScheduleCTV(null)}
        >
          <div
            style={{
              maxHeight: 'calc(100% - max(env(safe-area-inset-top, 0px), 44px) - 12px)',
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)'
            }}
            className={`${cardBg} w-full sm:max-w-md rounded-t-[28px] sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden border ${cardBorder}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* iOS Pull Indicator / Grabber Handle */}
            <div className="w-full flex justify-center pt-2.5 pb-1 shrink-0">
              <div className="w-9 h-1 rounded-full bg-[#8E8E93]/40" />
            </div>

            <div className={`px-4 pt-1 pb-3 border-b ${cardBorder} flex justify-between items-center ${isDark ? 'bg-[#141416]' : 'bg-[#F9F9F9]'}`}>
              <div>
                <h3 className={`font-bold text-[17px] ${textPrimary}`}>
                  Lịch của {viewScheduleCTV.name}
                </h3>
                <p className={`text-[12px] ${textSecondary}`}>
                  {bookings.filter((b) => b.ctvId === viewScheduleCTV.id).length} booking đã nhận
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewScheduleCTV(null)}
                className={`w-8 h-8 rounded-full ${inputBg} flex items-center justify-center ${textPrimary} cursor-pointer`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {bookings.filter((b) => b.ctvId === viewScheduleCTV.id).length === 0 ? (
                <p className={`text-center text-[13px] ${textSecondary} py-8`}>
                  CTV này chưa có lịch nào.
                </p>
              ) : (
                bookings
                  .filter((b) => b.ctvId === viewScheduleCTV.id)
                  .map((b) => (
                    <div key={b.id} className="space-y-1">
                      <div className={`text-[11px] font-bold ${textSecondary} uppercase`}>{b.date}</div>
                      <BookingCard
                        booking={b}
                        onSelect={(sel) => {
                          setViewScheduleCTV(null);
                          onSelectBooking(sel);
                        }}
                      />
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit CTV */}
      {modalOpen && (
        <div
          id="ctv-form-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className={`${cardBg} rounded-2xl w-full max-w-sm p-5 shadow-2xl border ${cardBorder}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className={`font-bold text-[17px] ${textPrimary}`}>
                {editingCTV ? 'Sửa thông tin CTV' : 'Thêm CTV mới'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className={`w-7 h-7 rounded-full ${inputBg} flex items-center justify-center ${textPrimary} cursor-pointer`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider ${textSecondary} mb-1`}>
                  Tên CTV *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Nguyễn Linh"
                  className={`w-full h-11 px-3 rounded-xl ${inputBg} border ${cardBorder} text-[14px] ${textPrimary} focus:outline-none focus:border-[#5856D6]`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider ${textSecondary} mb-1`}>
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="VD: 0981234567"
                  className={`w-full h-11 px-3 rounded-xl ${inputBg} border ${cardBorder} text-[14px] ${textPrimary} focus:outline-none focus:border-[#5856D6]`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider ${textSecondary} mb-1`}>
                  Ghi chú
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Khu vực hoạt động, thế mạnh phong cách..."
                  className={`w-full p-2.5 rounded-xl ${inputBg} border ${cardBorder} text-[13px] ${textPrimary} focus:outline-none focus:border-[#5856D6] resize-none`}
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="ctv-active-checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#5856D6]"
                />
                <label htmlFor="ctv-active-checkbox" className={`text-[13px] font-semibold ${textPrimary}`}>
                  Đang hoạt động (nhận lịch)
                </label>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-[#5856D6] text-white font-bold text-[15px] hover:bg-[#4745B8] active:scale-98 transition-all cursor-pointer"
                >
                  Lưu CTV
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Xóa CTV"
        message="Bạn có chắc muốn xóa CTV này? Các lịch đã giao trước đó sẽ không bị mất."
        onConfirm={() => {
          if (deleteId) {
            onDeleteCTV(deleteId);
            setDeleteId(null);
          }
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
