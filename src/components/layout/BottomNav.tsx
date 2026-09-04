import React from 'react';
import { ActiveTab } from '../../types';
import { Calendar, ClipboardList, TrendingUp, Settings, Plus } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenAddModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenAddModal
}) => {
  const { accentConfig, isDark } = useTheme();

  const navBg = isDark ? 'bg-[#1C1C1E]/95 border-[#2C2C2E]' : 'bg-white/95 border-[#E5E5EA]';
  const textInactive = isDark ? 'text-[#8E8E93] opacity-60' : 'text-[#8E8E93] opacity-70';

  return (
    <>
      {/* Floating Action Button (+) - Cố định theo viewport, luôn ở trên Bottom Navigation */}
      <button
        id="floating-add-booking-btn"
        type="button"
        onClick={onOpenAddModal}
        title="Thêm lịch Makeup mới"
        aria-label="Thêm lịch Makeup mới"
        style={{
          backgroundColor: accentConfig.hex,
          bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 12px) + 60px)',
          right: 'max(env(safe-area-inset-right, 0px), 16px)',
          position: 'fixed'
        }}
        className="z-30 w-13 h-13 sm:w-14 sm:h-14 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center text-3xl font-light hover:scale-105 active:scale-95 transition-all cursor-pointer border-0"
      >
        <Plus className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
      </button>

      {/* Bottom Navigation Bar - Gắn liền đáy màn hình chuẩn iOS với Safe Area */}
      <nav
        id="bottom-tab-navigation"
        style={{
          paddingTop: '8px',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 12px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 12px)'
        }}
        className={`w-full ${navBg} backdrop-blur-xl border-t flex justify-around items-center shrink-0 z-20 select-none`}
      >
        {/* Tab 1: Lịch */}
        <button
          id="nav-tab-calendar"
          type="button"
          onClick={() => onTabChange('calendar')}
          style={activeTab === 'calendar' ? { color: accentConfig.hex } : undefined}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            activeTab === 'calendar' ? 'font-bold' : textInactive
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[11px] mt-1 font-semibold">Lịch</span>
        </button>

        {/* Tab 2: Booking */}
        <button
          id="nav-tab-bookings"
          type="button"
          onClick={() => onTabChange('bookings')}
          style={activeTab === 'bookings' ? { color: accentConfig.hex } : undefined}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            activeTab === 'bookings' ? 'font-bold' : textInactive
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span className="text-[11px] mt-1 font-semibold">Booking</span>
        </button>

        {/* Tab 3: Doanh thu */}
        <button
          id="nav-tab-revenue"
          type="button"
          onClick={() => onTabChange('revenue')}
          style={activeTab === 'revenue' ? { color: accentConfig.hex } : undefined}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            activeTab === 'revenue' ? 'font-bold' : textInactive
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[11px] mt-1 font-semibold">Doanh thu</span>
        </button>

        {/* Tab 4: Cài đặt */}
        <button
          id="nav-tab-settings"
          type="button"
          onClick={() => onTabChange('settings')}
          style={activeTab === 'settings' ? { color: accentConfig.hex } : undefined}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            activeTab === 'settings' ? 'font-bold' : textInactive
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[11px] mt-1 font-semibold">Cài đặt</span>
        </button>
      </nav>
    </>
  );
};
