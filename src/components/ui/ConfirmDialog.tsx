import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = 'Xác nhận',
  message,
  confirmText = 'Xóa',
  cancelText = 'Hủy',
  onConfirm,
  onCancel,
  isDestructive = true
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="confirm-dialog-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in"
      onClick={onCancel}
    >
      <div
        id="confirm-dialog-content"
        className="bg-white rounded-2xl w-full max-w-xs p-5 shadow-2xl border border-[#E5E5EA] text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-[17px] text-[#1C1C1E] mb-2">{title}</h3>
        <p className="text-[14px] text-[#3A3A3C] mb-6 leading-relaxed">{message}</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            id="confirm-dialog-cancel-btn"
            type="button"
            onClick={onCancel}
            className="py-2.5 px-4 rounded-xl bg-[#F2F2F7] text-[#1C1C1E] font-semibold text-[15px] hover:bg-[#E5E5EA] active:scale-95 transition-all"
          >
            {cancelText}
          </button>
          <button
            id="confirm-dialog-action-btn"
            type="button"
            onClick={onConfirm}
            className={`py-2.5 px-4 rounded-xl text-white font-semibold text-[15px] active:scale-95 transition-all ${
              isDestructive ? 'bg-[#FF3B30] hover:bg-[#D70015]' : 'bg-[#007AFF] hover:bg-[#0062CC]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
