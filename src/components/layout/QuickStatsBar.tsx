import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface QuickStatsBarProps {
  totalCount: number;
  ownerCount: number;
  ctvCount: number;
  labelPrefix?: string;
  filterType?: 'all' | 'owner' | 'ctv';
  onFilterChange?: (filter: 'all' | 'owner' | 'ctv') => void;
  scrollProgress?: number;
  isCollapsed?: boolean;
}

export const QuickStatsBar: React.FC<QuickStatsBarProps> = ({
  totalCount,
  ownerCount,
  ctvCount,
  filterType = 'all',
  onFilterChange
}) => {
  const { isDark, accentConfig } = useTheme();

  const barBg = isDark ? 'bg-[#121214] border-[#2C2C2E]' : 'bg-[#F9F9F9] border-[#E5E5EA]';
  const cardBg = isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-[#E5E5EA]';
  const textPrimary = isDark ? 'text-white' : 'text-[#1C1C1E]';
  const textSecondary = isDark ? 'text-[#8E8E93]' : 'text-[#8E8E93]';

  return (
    <div
      id="quick-stats-bar"
      className={`${barBg} grid grid-cols-3 border-b shrink-0 select-none py-1.5 px-3 sm:px-4 gap-1.5 sm:gap-2`}
      style={{
        paddingLeft: 'max(env(safe-area-inset-left, 0px), 12px)',
        paddingRight: 'max(env(safe-area-inset-right, 0px), 12px)'
      }}
    >
      {/* ----------------------------------------------------------- */}
      {/* 1. TẤT CẢ / TỔNG SỐ CA (Dạng thu gọn single-line)            */}
      {/* ----------------------------------------------------------- */}
      <button
        id="quick-filter-all-btn"
        type="button"
        onClick={() => onFilterChange?.('all')}
        style={{
          backgroundColor: filterType === 'all' ? accentConfig.hex : undefined,
          borderColor: filterType === 'all' ? accentConfig.hex : undefined,
          color: filterType === 'all' ? '#FFFFFF' : undefined
        }}
        className={`h-8 sm:h-8.5 px-2 rounded-xl text-center border cursor-pointer active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 ${
          filterType === 'all' ? 'shadow-xs font-bold' : `${cardBg} hover:opacity-90`
        }`}
      >
        <span className="text-[11.5px] sm:text-[12px] font-semibold">Tất cả</span>
        <span
          className={`px-1.5 py-0.2 rounded-full text-[11px] font-extrabold leading-tight ${
            filterType === 'all'
              ? 'bg-white/25 text-white'
              : isDark
              ? 'bg-white/10 text-slate-300'
              : 'bg-black/6 text-slate-700'
          }`}
        >
          {totalCount}
        </span>
      </button>

      {/* ----------------------------------------------------------- */}
      {/* 2. TÔI (Dạng thu gọn single-line)                           */}
      {/* ----------------------------------------------------------- */}
      <button
        id="quick-filter-owner-btn"
        type="button"
        onClick={() => onFilterChange?.('owner')}
        style={{
          backgroundColor: filterType === 'owner' ? accentConfig.hex : undefined,
          borderColor: filterType === 'owner' ? accentConfig.hex : undefined,
          color: filterType === 'owner' ? '#FFFFFF' : undefined
        }}
        className={`h-8 sm:h-8.5 px-2 rounded-xl text-center border cursor-pointer active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 ${
          filterType === 'owner' ? 'shadow-xs font-bold' : `${cardBg} hover:opacity-90`
        }`}
      >
        <span className="text-[11px]">👑</span>
        <span className="text-[11.5px] sm:text-[12px] font-semibold">Tôi</span>
        <span
          className={`px-1.5 py-0.2 rounded-full text-[11px] font-extrabold leading-tight ${
            filterType === 'owner'
              ? 'bg-white/25 text-white'
              : isDark
              ? 'bg-white/10 text-slate-300'
              : 'bg-black/6 text-slate-700'
          }`}
        >
          {ownerCount}
        </span>
      </button>

      {/* ----------------------------------------------------------- */}
      {/* 3. CTV (Dạng thu gọn single-line)                           */}
      {/* ----------------------------------------------------------- */}
      <button
        id="quick-filter-ctv-btn"
        type="button"
        onClick={() => onFilterChange?.('ctv')}
        style={{
          backgroundColor: filterType === 'ctv' ? '#5856D6' : undefined,
          borderColor: filterType === 'ctv' ? '#5856D6' : undefined,
          color: filterType === 'ctv' ? '#FFFFFF' : undefined
        }}
        className={`h-8 sm:h-8.5 px-2 rounded-xl text-center border cursor-pointer active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 ${
          filterType === 'ctv' ? 'shadow-xs font-bold' : `${cardBg} hover:opacity-90`
        }`}
      >
        <span className="text-[11px]">🤝</span>
        <span className="text-[11.5px] sm:text-[12px] font-semibold">CTV</span>
        <span
          className={`px-1.5 py-0.2 rounded-full text-[11px] font-extrabold leading-tight ${
            filterType === 'ctv'
              ? 'bg-white/25 text-white'
              : isDark
              ? 'bg-white/10 text-slate-300'
              : 'bg-black/6 text-slate-700'
          }`}
        >
          {ctvCount}
        </span>
      </button>
    </div>
  );
};
