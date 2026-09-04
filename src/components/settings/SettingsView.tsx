import React, { useState, useRef } from 'react';
import { ReminderOption, ThemeMode, AccentColor, CTV, Booking } from '../../types';
import {
  getDefaultReminder,
  setDefaultReminder,
  exportBackupFile,
  generateSyncCode,
  parseSyncCode,
  restoreFromBackup,
  getLastBackupTime,
  getCustomAccentHex
} from '../../services/storageService';
import { useTheme, ACCENT_COLORS } from '../../contexts/ThemeContext';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  showBrowserNotification
} from '../../services/notificationService';
import {
  Sun,
  Moon,
  Palette,
  Bell,
  Check,
  Sparkles,
  Users,
  ChevronRight,
  ChevronDown,
  Download,
  Upload,
  Copy,
  Cloud,
  FileJson,
  Sliders,
  CheckCircle2,
  AlertCircle,
  X,
  Share2,
  Volume2,
  Smartphone
} from 'lucide-react';
import { CTVListView } from '../ctv/CTVListView';

interface SettingsViewProps {
  onResetDemo: () => void;
  ctvs?: CTV[];
  bookings?: Booking[];
  onSaveCTV?: (ctv: CTV) => void;
  onDeleteCTV?: (id: string) => void;
  onSelectBooking?: (booking: Booking) => void;
  firestoreStatus?: 'connected' | 'syncing' | 'error';
  firestoreError?: string | null;
  onSyncAllToFirestore?: () => Promise<number>;
}

const REMINDER_OPTIONS: { value: ReminderOption; label: string }[] = [
  { value: '15_mins', label: '15 phút' },
  { value: '30_mins', label: '30 phút' },
  { value: '1_hour', label: '1 giờ' },
  { value: '2_hours', label: '2 giờ' }
];

// 8 tông màu makeup thời thượng gợi ý
const TRENDY_MAKEUP_PALETTE = [
  { name: 'Hồng Đào', hex: '#FF6B81' },
  { name: 'Đỏ Cherry', hex: '#E0245E' },
  { name: 'Cam San Hô', hex: '#FF7F50' },
  { name: 'Nude Đất', hex: '#C07D53' },
  { name: 'Đỏ Rượu', hex: '#8B0000' },
  { name: 'Tím Lavender', hex: '#8E44AD' },
  { name: 'Xanh Mint', hex: '#16A085' },
  { name: 'Champagne', hex: '#B8860B' }
];

// Helper: chuyển đổi Hue (0-360) sang mã màu HEX với độ bão hòa 85% và độ sáng 52%
function hueToHex(hue: number): string {
  const h = hue;
  const s = 0.85;
  const l = 0.52;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  ctvs = [],
  bookings = [],
  onSaveCTV = () => {},
  onDeleteCTV = () => {},
  onSelectBooking = () => {},
  firestoreStatus = 'connected',
  firestoreError = null,
  onSyncAllToFirestore
}) => {
  const {
    theme,
    setTheme,
    accent,
    setAccent,
    customHex,
    setCustomColor,
    accentConfig,
    isDark
  } = useTheme();

  const [defaultReminder, setReminderState] = useState<ReminderOption>(() => getDefaultReminder());
  const [subView, setSubView] = useState<'main' | 'ctv'>('main');
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // Trạng thái thu gọn/mở rộng phần Tông màu chủ đạo (mặc định thu gọn)
  const [isColorExpanded, setIsColorExpanded] = useState(false);

  // Trạng thái thông báo đẩy & Service Worker
  const [notifPerm, setNotifPerm] = useState<'granted' | 'denied' | 'default' | 'unsupported'>(
    () => getNotificationPermissionStatus()
  );
  const [isTestingNotif, setIsTestingNotif] = useState(false);

  // Slider hue state (0 - 360)
  const [hueValue, setHueValue] = useState<number>(330);
  const [hexInputText, setHexInputText] = useState<string>(() => getCustomAccentHex());

  // Trạng thái sao lưu & đồng bộ
  const [lastBackup, setLastBackup] = useState<number | null>(() => getLastBackupTime());
  const [backupNotice, setBackupNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedSyncCode, setCopiedSyncCode] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncCodeInput, setSyncCodeInput] = useState('');
  const [syncMode, setSyncMode] = useState<'overwrite' | 'merge'>('overwrite');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReminderChange = (val: ReminderOption) => {
    setReminderState(val);
    setDefaultReminder(val);
  };

  const handleRequestNotif = async () => {
    const status = await requestNotificationPermission();
    setNotifPerm(status);
    if (status === 'granted') {
      await showBrowserNotification(
        '🔔 Ynii Makeup: Đã bật thông báo!',
        'Hệ thống sẽ kích hoạt rung và chuông nhắc khi đến giờ ca makeup của bạn.'
      );
    }
  };

  const handleTestNotif = async () => {
    setIsTestingNotif(true);
    await showBrowserNotification(
      '🔔 Ynii Makeup: Thử nghiệm chuông & rung',
      'Chuông và rung hoạt động chính xác! Bạn sẽ luôn nhận được thông báo ngay cả khi thu nhỏ ứng dụng.'
    );
    setTimeout(() => setIsTestingNotif(false), 900);
  };

  // Kéo thanh trượt màu tự do
  const handleHueSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setHueValue(val);
    const newHex = hueToHex(val);
    setHexInputText(newHex);
    setCustomColor(newHex);
  };

  // Nhập trực tiếp mã HEX
  const handleHexInputChange = (val: string) => {
    setHexInputText(val);
    if (/^#?([0-9A-F]{3}|[0-9A-F]{6})$/i.test(val)) {
      setCustomColor(val.startsWith('#') ? val : `#${val}`);
    }
  };

  // Xuất file sao lưu .json
  const handleExportBackup = () => {
    try {
      exportBackupFile();
      setLastBackup(Date.now());
      setBackupNotice({
        type: 'success',
        message: 'Đã tải tệp sao lưu (.json) về máy. Bạn có thể lưu vào iCloud, Google Drive hoặc gửi sang máy mới!'
      });
      setTimeout(() => setBackupNotice(null), 5000);
    } catch {
      setBackupNotice({
        type: 'error',
        message: 'Không thể xuất tệp sao lưu. Vui lòng thử lại.'
      });
    }
  };

  // Sao chép mã đồng bộ
  const handleCopySyncCode = () => {
    try {
      const code = generateSyncCode();
      navigator.clipboard.writeText(code);
      setCopiedSyncCode(true);
      setLastBackup(Date.now());
      setBackupNotice({
        type: 'success',
        message: 'Đã sao chép mã đồng bộ vào bộ nhớ tạm! Bạn có thể dán mã này vào máy mới.'
      });
      setTimeout(() => {
        setCopiedSyncCode(false);
        setBackupNotice(null);
      }, 5000);
    } catch {
      setBackupNotice({
        type: 'error',
        message: 'Không thể sao chép mã. Vui lòng thử lại.'
      });
    }
  };

  // Chọn tệp sao lưu từ máy để khôi phục
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const result = restoreFromBackup(parsed, syncMode);
        setLastBackup(Date.now());
        setBackupNotice({
          type: 'success',
          message: `Đồng bộ thành công ${result.bookingsCount} lịch makeup và ${result.ctvsCount} CTV lên thiết bị này!`
        });
        setTimeout(() => setBackupNotice(null), 6000);
      } catch {
        setBackupNotice({
          type: 'error',
          message: 'Tệp sao lưu không đúng định dạng hoặc bị lỗi. Vui lòng chọn đúng tệp .json đã xuất.'
        });
      }
    };
    reader.readAsText(file);
    // Reset file input để có thể chọn lại cùng file nếu muốn
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Áp dụng mã đồng bộ nhập tay
  const handleApplySyncCode = () => {
    if (!syncCodeInput.trim()) return;
    try {
      const backupData = parseSyncCode(syncCodeInput);
      const result = restoreFromBackup(backupData, syncMode);
      setLastBackup(Date.now());
      setShowSyncModal(false);
      setSyncCodeInput('');
      setBackupNotice({
        type: 'success',
        message: `Đồng bộ thành công ${result.bookingsCount} lịch makeup và ${result.ctvsCount} CTV từ mã đồng bộ!`
      });
      setTimeout(() => setBackupNotice(null), 6000);
    } catch {
      setBackupNotice({
        type: 'error',
        message: 'Mã đồng bộ không hợp lệ. Vui lòng kiểm tra lại mã đã sao chép từ máy cũ.'
      });
    }
  };

  if (subView === 'ctv') {
    return (
      <CTVListView
        ctvs={ctvs}
        bookings={bookings}
        onSaveCTV={onSaveCTV}
        onDeleteCTV={onDeleteCTV}
        onSelectBooking={onSelectBooking}
        onBack={() => setSubView('main')}
      />
    );
  }

  // Theme styling tokens
  const viewBg = isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]';
  const cardBg = isDark ? 'bg-[#1C1C1E]' : 'bg-white';
  const cardBorder = isDark ? 'border-[#2C2C2E]' : 'border-[#E5E5EA]';
  const textPrimary = isDark ? 'text-white' : 'text-[#1C1C1E]';
  const textSecondary = isDark ? 'text-[#8E8E93]' : 'text-[#636366]';
  const inputBg = isDark ? 'bg-[#2C2C2E]' : 'bg-[#F2F2F7]';

  return (
    <div id="settings-view-root" className={`flex-1 flex flex-col overflow-hidden ${viewBg}`}>
      {/* Header: Đã bỏ phần chữ nhỏ dưới tiêu đề */}
      <div
        className={`${cardBg} border-b ${cardBorder} shrink-0 select-none`}
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
          paddingBottom: '12px',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 20px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 20px)'
        }}
      >
        <h2 className={`text-xl font-bold ${textPrimary}`}>Cài đặt</h2>
      </div>

      <div
        className="flex-1 overflow-y-auto ios-scrollable p-4 space-y-4"
        style={{
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 16px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 16px)',
          paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 12px) + 64px)'
        }}
      >
        {/* Banner thông báo kết quả sao lưu / đồng bộ */}
        {backupNotice && (
          <div
            className={`p-3.5 rounded-2xl flex items-start gap-2.5 shadow-xs border ${
              backupNotice.type === 'success'
                ? 'bg-[#34C759]/15 border-[#34C759]/30 text-[#34C759]'
                : 'bg-[#FF3B30]/15 border-[#FF3B30]/30 text-[#FF3B30]'
            }`}
          >
            {backupNotice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-[13px] font-semibold leading-relaxed">
              {backupNotice.message}
            </div>
            <button
              type="button"
              onClick={() => setBackupNotice(null)}
              className="opacity-70 hover:opacity-100 cursor-pointer p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION 1: CỘNG TÁC VIÊN (CTV)                               */}
        {/* ============================================================ */}
        <div>
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <Users className="w-4 h-4" style={{ color: accentConfig.hex }} />
            <h3 className={`text-[12px] font-bold uppercase tracking-wider ${textSecondary}`}>
              Cộng tác viên (CTV)
            </h3>
          </div>

          <div className={`${cardBg} p-2 rounded-2xl border ${cardBorder} shadow-xs`}>
            <button
              id="settings-open-ctv-btn"
              type="button"
              onClick={() => setSubView('ctv')}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer hover:${inputBg} active:scale-[0.99]`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: accentConfig.lightBg, color: accentConfig.hex }}
                >
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className={`text-[15px] font-bold ${textPrimary} block`}>
                    Quản lý CTV
                  </span>
                  <span className={`text-[12px] ${textSecondary}`}>
                    {ctvs.length} cộng tác viên
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-bold" style={{ color: accentConfig.hex }}>
                  Mở danh sách
                </span>
                <ChevronRight className={`w-4 h-4 ${textSecondary}`} />
              </div>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 2: THÔNG BÁO NHẮC LỊCH (ĐÃ BỎ KO NHẮC & 1 NGÀY)     */}
        {/* ============================================================ */}
        <div>
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <Bell className="w-4 h-4" style={{ color: accentConfig.hex }} />
            <h3 className={`text-[12px] font-bold uppercase tracking-wider ${textSecondary}`}>
              Nhắc lịch & Thông báo
            </h3>
          </div>

          <div className={`${cardBg} p-3.5 rounded-2xl border ${cardBorder} shadow-xs space-y-3`}>
            {/* 4 ô chọn thời gian nhắc gọn gàng thành 1 hàng ngang 4 cột */}
            <div className="grid grid-cols-4 gap-1.5">
              {REMINDER_OPTIONS.map((opt) => {
                const isSelected = defaultReminder === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleReminderChange(opt.value)}
                    style={
                      isSelected
                        ? { backgroundColor: accentConfig.hex, color: '#FFFFFF' }
                        : undefined
                    }
                    className={`h-9 px-1 rounded-xl text-[12px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'shadow-xs'
                        : `${inputBg} ${textPrimary} border ${cardBorder} hover:opacity-80`
                    }`}
                  >
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mục xin quyền Notification & Kích hoạt chuông/rung Service Worker */}
            <div className={`pt-2.5 border-t ${cardBorder} space-y-2`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" style={{ color: accentConfig.hex }} />
                  <span className={`text-[13px] font-bold ${textPrimary} block leading-tight`}>
                    Thông báo đẩy & Chuông rung
                  </span>
                </div>

                {notifPerm === 'granted' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#34C759]/15 text-[#34C759]">
                    <CheckCircle2 className="w-3 h-3" />
                    Đã bật
                  </span>
                ) : notifPerm === 'denied' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FF3B30]/15 text-[#FF3B30]">
                    <AlertCircle className="w-3 h-3" />
                    Bị chặn
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FF9500]/15 text-[#FF9500]">
                    Chưa bật
                  </span>
                )}
              </div>

              {notifPerm === 'granted' ? (
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={handleTestNotif}
                    disabled={isTestingNotif}
                    className={`w-full h-9 px-3 rounded-xl border ${cardBorder} ${inputBg} ${textPrimary} text-[12px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer hover:opacity-85 active:scale-98`}
                  >
                    <Volume2 className="w-4 h-4" style={{ color: accentConfig.hex }} />
                    <span>{isTestingNotif ? 'Đang thử chuông...' : 'Thử chuông & rung ngay'}</span>
                  </button>
                </div>
              ) : notifPerm === 'denied' ? (
                <div className="p-2.5 rounded-xl bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[12px] text-[#FF3B30]">
                  <p className="font-semibold">Quyền thông báo đang bị chặn. Vui lòng cho phép trong cài đặt trình duyệt.</p>
                </div>
              ) : (
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={handleRequestNotif}
                    style={{ backgroundColor: accentConfig.hex }}
                    className="w-full h-9 px-3 rounded-xl text-white text-[12.5px] font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer hover:opacity-90 active:scale-98 transition-all"
                  >
                    <Bell className="w-4 h-4" />
                    <span>Bật thông báo đẩy & Chuông nhắc</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 3: GIAO DIỆN (CHẾ ĐỘ HIỂN THỊ SÁNG / TỐI)             */}
        {/* ============================================================ */}
        <div>
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <Sun className="w-4 h-4" style={{ color: accentConfig.hex }} />
            <h3 className={`text-[12px] font-bold uppercase tracking-wider ${textSecondary}`}>
              Chế độ hiển thị
            </h3>
          </div>

          <div className={`${cardBg} p-3 rounded-2xl border ${cardBorder} shadow-xs`}>
            <div className="grid grid-cols-2 gap-2">
              {/* Light Mode Button */}
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`h-12 rounded-xl border p-2.5 flex items-center justify-between transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'border-2 shadow-xs bg-white'
                    : 'border-[#E5E5EA] bg-[#F2F2F7] opacity-60 hover:opacity-100'
                }`}
                style={{
                  borderColor: theme === 'light' ? accentConfig.hex : undefined
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#FF9500]/15 text-[#FF9500] flex items-center justify-center">
                    <Sun className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[14px] font-bold text-[#1C1C1E]">
                    Sáng
                  </span>
                </div>
                {theme === 'light' && (
                  <div
                    className="w-4.5 h-4.5 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: accentConfig.hex }}
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </button>

              {/* Dark Mode Button */}
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`h-12 rounded-xl border p-2.5 flex items-center justify-between transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'border-2 shadow-xs bg-[#2C2C2E]'
                    : 'border-[#38383A] bg-[#1C1C1E] opacity-60 hover:opacity-100'
                }`}
                style={{
                  borderColor: theme === 'dark' ? accentConfig.hex : undefined
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#5856D6]/20 text-[#AF52DE] flex items-center justify-center">
                    <Moon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[14px] font-bold text-white">
                    Tối
                  </span>
                </div>
                {theme === 'dark' && (
                  <div
                    className="w-4.5 h-4.5 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: accentConfig.hex }}
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 4: TÔNG MÀU CHỦ ĐẠO (ACCENT COLOR)                    */}
        {/* THU GỌN, CHỈ CÁC Ô MÀU, BỎ TÊN MÀU & BỎ CHỮ THUYẾT MINH       */}
        {/* ============================================================ */}
        <div>
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <Palette className="w-4 h-4" style={{ color: accentConfig.hex }} />
            <h3 className={`text-[12px] font-bold uppercase tracking-wider ${textSecondary}`}>
              Tông màu chủ đạo
            </h3>
          </div>

          <div className={`${cardBg} rounded-2xl border ${cardBorder} shadow-xs overflow-hidden transition-all`}>
            {/* Header thu gọn: Chỉ hiện màu đang chọn, bấm vào để mở rộng */}
            <button
              type="button"
              id="settings-accent-toggle-btn"
              onClick={() => setIsColorExpanded(!isColorExpanded)}
              className={`w-full p-3 flex items-center justify-between transition-colors cursor-pointer hover:${inputBg} text-left`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs relative"
                  style={{ backgroundColor: accentConfig.hex }}
                >
                  <Palette className="w-4 h-4 text-white drop-shadow-xs" />
                </div>
                <div>
                  <span className={`text-[13.5px] font-bold ${textPrimary} block leading-tight`}>
                    Mã màu
                  </span>
                  <span className={`text-[11px] font-mono ${textSecondary}`}>
                    {accentConfig.hex}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[12px] font-bold shadow-2xs"
                  style={{ backgroundColor: accentConfig.lightBg, color: accentConfig.hex }}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: accentConfig.hex }}
                  />
                  <span>Đang chọn</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 ${textSecondary} transition-transform duration-250 ${
                    isColorExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {/* Các tùy chọn mở rộng khi bấm vào: BỎ TÊN MÀU, BỎ CHỮ THUYẾT MINH */}
            {isColorExpanded && (
              <div className={`p-3.5 pt-2.5 border-t ${cardBorder} space-y-3`}>
                {/* 5 Màu sắc Preset có sẵn + 1 Ô Tự Chọn Màu: Chỉ hiển thị ô màu, KHÔNG CÓ TÊN MÀU */}
                <div className="grid grid-cols-6 gap-2 place-items-center py-1">
                  {(['blue', 'purple', 'pink', 'orange', 'green'] as AccentColor[]).map((colKey) => {
                    const item = ACCENT_COLORS[colKey as keyof typeof ACCENT_COLORS];
                    const isSelected = accent === colKey;

                    return (
                      <button
                        key={colKey}
                        type="button"
                        onClick={() => setAccent(colKey)}
                        className="w-9 h-9 rounded-full flex items-center justify-center shadow-xs transition-transform cursor-pointer hover:opacity-90 active:scale-95"
                        style={{
                          backgroundColor: item.hex,
                          transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                          boxShadow: isSelected
                            ? `0 0 0 2.5px ${isDark ? '#1C1C1E' : '#FFFFFF'}, 0 0 0 4.5px ${item.hex}`
                            : undefined
                        }}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                      </button>
                    );
                  })}

                  {/* Ô Tự chọn màu (Custom Color): Không có chữ */}
                  <button
                    type="button"
                    onClick={() => setCustomColor(customHex || '#FF2D55')}
                    className="w-9 h-9 rounded-full flex items-center justify-center shadow-xs transition-transform relative overflow-hidden cursor-pointer hover:opacity-90 active:scale-95"
                    style={{
                      background: 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                      transform: accent === 'custom' ? 'scale(1.1)' : 'scale(1)',
                      boxShadow: accent === 'custom'
                        ? `0 0 0 2.5px ${isDark ? '#1C1C1E' : '#FFFFFF'}, 0 0 0 4.5px ${accentConfig.hex}`
                        : undefined
                    }}
                  >
                    <div
                      className="w-4.5 h-4.5 rounded-full shadow-inner flex items-center justify-center"
                      style={{ backgroundColor: accent === 'custom' ? accentConfig.hex : '#ffffff' }}
                    >
                      {accent === 'custom' ? (
                        <Check className="w-3 h-3 text-white stroke-[3]" />
                      ) : (
                        <Sliders className="w-2.5 h-2.5 text-black/70" />
                      )}
                    </div>
                  </button>
                </div>

                {/* THANH KÉO MÀU, BẢNG CHỌN MÀU & MÃ MÀU - KHÔNG CHỮ THUYẾT MINH */}
                <div className={`pt-2.5 border-t ${cardBorder} space-y-2.5`}>
                  {/* 1. Thanh kéo màu quang phổ cầu vồng */}
                  <div className="relative flex items-center">
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={hueValue}
                      onChange={handleHueSliderChange}
                      className="w-full h-4 rounded-full appearance-none cursor-pointer outline-hidden shadow-inner"
                      style={{
                        background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
                      }}
                    />
                  </div>

                  {/* 2. Ô chọn màu native & Nhập HEX */}
                  <div className="flex items-center gap-2">
                    <label className="relative cursor-pointer shrink-0">
                      <input
                        type="color"
                        value={accentConfig.hex}
                        onChange={(e) => {
                          setHexInputText(e.target.value.toUpperCase());
                          setCustomColor(e.target.value);
                        }}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                      <div
                        className="h-9 px-3 rounded-xl border flex items-center gap-1.5 transition-all shadow-xs"
                        style={{
                          backgroundColor: accentConfig.hex,
                          borderColor: isDark ? '#3A3A3C' : '#D1D1D6'
                        }}
                      >
                        <Palette className="w-3.5 h-3.5 text-white drop-shadow-xs" />
                        <span className="text-[12px] font-bold text-white drop-shadow-xs">
                          Bảng màu
                        </span>
                      </div>
                    </label>

                    {/* Nhập mã HEX */}
                    <div className={`flex-1 h-9 px-2.5 rounded-xl border ${cardBorder} ${inputBg} flex items-center gap-1`}>
                      <span className={`text-[12px] font-bold font-mono ${textSecondary}`}>#</span>
                      <input
                        type="text"
                        maxLength={7}
                        value={hexInputText.replace('#', '')}
                        onChange={(e) => handleHexInputChange(e.target.value)}
                        placeholder="FF2D55"
                        className={`w-full bg-transparent font-mono text-[12px] font-bold uppercase ${textPrimary} outline-hidden`}
                      />
                    </div>
                  </div>

                  {/* 3. Dải các ô màu gợi ý: CHỈ CÁC Ô MÀU, BỎ TÊN MÀU */}
                  <div className="grid grid-cols-8 gap-1 pt-0.5">
                    {TRENDY_MAKEUP_PALETTE.map((c) => {
                      const isPicked = accentConfig.hex.toUpperCase() === c.hex.toUpperCase();
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          title={c.name}
                          onClick={() => {
                            setHexInputText(c.hex);
                            setCustomColor(c.hex);
                          }}
                          className="h-7 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                          style={{
                            backgroundColor: c.hex,
                            boxShadow: isPicked ? `0 0 0 2px ${isDark ? '#1C1C1E' : '#FFFFFF'}, 0 0 0 3.5px ${c.hex}` : undefined
                          }}
                        >
                          {isPicked && <Check className="w-3 h-3 text-white stroke-[3] drop-shadow-xs" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 5: SAO LƯU & ĐỒNG BỘ DỮ LIỆU                         */}
        {/* ============================================================ */}
        <div>
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <Cloud className="w-4 h-4" style={{ color: accentConfig.hex }} />
            <h3 className={`text-[12px] font-bold uppercase tracking-wider ${textSecondary}`}>
              Sao lưu & Đồng bộ
            </h3>
          </div>

          <div className={`${cardBg} p-3.5 rounded-2xl border ${cardBorder} shadow-xs space-y-3`}>
            {/* Tóm tắt tình trạng dữ liệu */}
            <div className={`p-2.5 rounded-xl ${inputBg} border ${cardBorder} flex items-center justify-between`}>
              <div>
                <span className={`text-[13px] font-bold ${textPrimary} block`}>
                  Dữ liệu trên máy
                </span>
                <span className={`text-[11px] ${textSecondary}`}>
                  {bookings.length} lịch makeup • {ctvs.length} CTV
                </span>
              </div>
              <div className="text-right">
                <span className={`text-[10px] uppercase font-bold tracking-wider ${textSecondary} block`}>
                  Gần nhất
                </span>
                <span className="text-[11px] font-bold text-[#34C759]">
                  {lastBackup ? new Date(lastBackup).toLocaleDateString('vi-VN') : 'Chưa lưu'}
                </span>
              </div>
            </div>

            {/* Firebase Firestore Realtime Cloud */}
            <div className={`p-3 rounded-xl border ${cardBorder} ${inputBg} space-y-2`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative flex h-2.5 w-2.5">
                    {firestoreStatus === 'connected' ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34C759] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#34C759]"></span>
                      </>
                    ) : firestoreStatus === 'syncing' ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9500] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF9500]"></span>
                      </>
                    ) : (
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF3B30]"></span>
                    )}
                  </div>
                  <span className={`text-[13px] font-bold ${textPrimary}`}>
                    Firestore Cloud
                  </span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                    firestoreStatus === 'connected'
                      ? 'bg-[#34C759]/15 text-[#34C759]'
                      : firestoreStatus === 'syncing'
                      ? 'bg-[#FF9500]/15 text-[#FF9500]'
                      : 'bg-[#FF3B30]/15 text-[#FF3B30]'
                  }`}
                >
                  {firestoreStatus === 'connected'
                    ? 'Thời gian thực'
                    : firestoreStatus === 'syncing'
                    ? 'Đang đồng bộ...'
                    : 'Ngoại tuyến'}
                </span>
              </div>

              {onSyncAllToFirestore && (
                <button
                  type="button"
                  onClick={async () => {
                    setIsSyncingCloud(true);
                    try {
                      const count = await onSyncAllToFirestore();
                      setBackupNotice({
                        type: 'success',
                        message: `Đã đồng bộ thành công ${count} lịch makeup lên Firebase Firestore!`
                      });
                    } catch (err: any) {
                      setBackupNotice({
                        type: 'error',
                        message: `Lỗi đồng bộ Firestore: ${err?.message || 'Không thể kết nối'}`
                      });
                    } finally {
                      setIsSyncingCloud(false);
                    }
                  }}
                  disabled={isSyncingCloud}
                  className={`w-full h-9 px-3 rounded-xl border ${cardBorder} ${inputBg} ${textPrimary} text-[12px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer hover:opacity-85 active:scale-98 disabled:opacity-50`}
                >
                  <Cloud className="w-4 h-4" style={{ color: accentConfig.hex }} />
                  <span>
                    {isSyncingCloud ? 'Đang đồng bộ...' : 'Đồng bộ toàn bộ lịch lên Cloud'}
                  </span>
                </button>
              )}
            </div>

            {/* 1. Sao lưu thiết bị */}
            <div className="space-y-1.5 pt-1">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${textSecondary} block`}>
                1. Sao lưu thiết bị
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="h-10 px-3 rounded-xl text-white font-bold text-[12.5px] flex items-center justify-center gap-1.5 shadow-xs active:scale-98 transition-all cursor-pointer"
                  style={{ backgroundColor: accentConfig.hex }}
                >
                  <Download className="w-4 h-4" />
                  <span>Tải file sao lưu</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopySyncCode}
                  className={`h-10 px-3 rounded-xl border ${cardBorder} ${inputBg} ${textPrimary} font-bold text-[12.5px] flex items-center justify-center gap-1.5 shadow-2xs active:scale-98 transition-all cursor-pointer hover:opacity-90`}
                >
                  {copiedSyncCode ? (
                    <>
                      <Check className="w-4 h-4 text-[#34C759]" />
                      <span className="text-[#34C759]">Đã chép!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>Mã đồng bộ</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 2. Khôi phục dữ liệu */}
            <div className={`pt-2.5 border-t ${cardBorder} space-y-1.5`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${textSecondary} block`}>
                  2. Khôi phục dữ liệu
                </span>
                <div className="flex items-center gap-1 text-[11px]">
                  <span className={textSecondary}>Chế độ:</span>
                  <select
                    value={syncMode}
                    onChange={(e) => setSyncMode(e.target.value as 'overwrite' | 'merge')}
                    className={`bg-transparent font-bold ${textPrimary} outline-hidden cursor-pointer`}
                  >
                    <option value="overwrite">Ghi đè</option>
                    <option value="merge">Hợp nhất</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Input ẩn để chọn file .json */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`h-10 px-3 rounded-xl border ${cardBorder} ${inputBg} ${textPrimary} font-bold text-[12.5px] flex items-center justify-center gap-1.5 shadow-2xs active:scale-98 transition-all cursor-pointer hover:opacity-90`}
                >
                  <Upload className="w-4 h-4 text-[#34C759]" />
                  <span>Chọn tệp sao lưu</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSyncModal(true)}
                  className={`h-10 px-3 rounded-xl border ${cardBorder} ${inputBg} ${textPrimary} font-bold text-[12.5px] flex items-center justify-center gap-1.5 shadow-2xs active:scale-98 transition-all cursor-pointer hover:opacity-90`}
                >
                  <FileJson className="w-4 h-4" style={{ color: accentConfig.hex }} />
                  <span>Dán mã đồng bộ</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 6: THÔNG TIN ỨNG DỤNG                                */}
        {/* ============================================================ */}
        <div className="text-center pt-2 pb-6 space-y-1">
          <div
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 text-[11px] font-bold tracking-wide"
            style={{ color: accentConfig.hex }}
          >
            <Sparkles className="w-3 h-3" />
            Ynii Makeup Manager
          </div>
          <p className={`text-[12px] ${textSecondary}`}>
            Sổ lịch Makeup thông minh • Tối ưu cho iPhone & iPad
          </p>
        </div>
      </div>

      {/* Modal nhập mã đồng bộ */}
      {showSyncModal && (
        <div
          id="sync-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setShowSyncModal(false)}
        >
          <div
            id="sync-modal-content"
            className={`${cardBg} rounded-3xl w-full max-w-md p-5 shadow-2xl border ${cardBorder} space-y-4`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5" style={{ color: accentConfig.hex }} />
                <h3 className={`font-bold text-[17px] ${textPrimary}`}>Nhập mã đồng bộ</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className={`p-1.5 rounded-full ${inputBg} ${textSecondary} hover:${textPrimary} cursor-pointer`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className={`text-[13px] ${textSecondary} leading-relaxed`}>
              Dán chuỗi mã đồng bộ được sao chép từ thiết bị cũ để nạp toàn bộ lịch makeup và danh sách CTV sang máy này:
            </p>

            <div className="space-y-2">
              <textarea
                rows={4}
                value={syncCodeInput}
                onChange={(e) => setSyncCodeInput(e.target.value)}
                placeholder="Dán mã bắt đầu bằng YNII_... tại đây"
                className={`w-full p-3 rounded-xl border ${cardBorder} ${inputBg} ${textPrimary} font-mono text-[12px] outline-hidden resize-none`}
              />

              <div className="flex items-center justify-between text-[12px]">
                <span className={textSecondary}>Chế độ phục hồi:</span>
                <div className="flex gap-2">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="modal-sync-mode"
                      checked={syncMode === 'overwrite'}
                      onChange={() => setSyncMode('overwrite')}
                    />
                    <span className={textPrimary}>Ghi đè</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="modal-sync-mode"
                      checked={syncMode === 'merge'}
                      onChange={() => setSyncMode('merge')}
                    />
                    <span className={textPrimary}>Hợp nhất</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className={`h-11 rounded-xl ${inputBg} ${textPrimary} font-semibold text-[14px] cursor-pointer`}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={!syncCodeInput.trim()}
                onClick={handleApplySyncCode}
                style={{ backgroundColor: accentConfig.hex }}
                className="h-11 rounded-xl text-white font-bold text-[14px] disabled:opacity-50 active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                Đồng bộ ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
