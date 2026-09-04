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
  labelPrefix,
  filterType = 'all',
  onFilterChange,
  scrollProgress = 0,
  isCollapsed = false
}) => {
  const { isDark, accentConfig } = useTheme();

  // Chuẩn hóa scrollProgress trong khoảng [0, 1]
  const p = typeof scrollProgress === 'number'
    ? Math.min(1, Math.max(0, scrollProgress))
    : (isCollapsed ? 1 : 0);

  const barBg = isDark ? 'bg-[#121214] border-[#2C2C2E]' : 'bg-[#F9F9F9] border-[#E5E5EA]';
  const cardBg = isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-[#E5E5EA]';
  const textPrimary = isDark ? 'text-white' : 'text-[#1C1C1E]';
  const textSecondary = isDark ? 'text-[#8E8E93]' : 'text-[#8E8E93]';

  return (
    <div
      id="quick-stats-bar"
      className={`${barBg} grid grid-cols-3 border-b shrink-0 select-none`}
      style={{
        paddingTop: `${Math.round(8 - p * 4)}px`,
        paddingBottom: `${Math.round(8 - p * 4)}px`,
        paddingLeft: `max(env(safe-area-inset-left, 0px), ${Math.round(14 - p * 2)}px)`,
        paddingRight: `max(env(safe-area-inset-right, 0px), ${Math.round(14 - p * 2)}px)`,
        gap: `${Math.round(8 - p * 2)}px`
      }}
    >
      {/* ----------------------------------------------------------- */}
      {/* 1. TẤT CẢ / TỔNG SỐ CA                                      */}
      {/* ----------------------------------------------------------- */}
      <button
        type="button"
        onClick={() => onFilterChange?.('all')}
        style={{
          backgroundColor: filterType === 'all' ? accentConfig.hex : undefined,
          borderColor: filterType === 'all' ? accentConfig.hex : undefined,
          color: filterType === 'all' ? '#FFFFFF' : undefined,
          paddingTop: `${Math.round(6 - p * 2.5)}px`,
          paddingBottom: `${Math.round(6 - p * 2.5)}px`,
          borderRadius: `${Math.round(12 - p * 2)}px`
        }}
        className={`px-2 text-center border cursor-pointer active:scale-[0.98] ${
          filterType === 'all'
            ? 'shadow-xs'
            : `${cardBg} hover:opacity-90`
        }`}
      >
        <div className="flex flex-col items-center justify-center text-center">
          {/* Label trên - fade out và co chiều cao liên tục */}
          <div
            style={{
              height: `${Math.max(0, (1 - p) * 14)}px`,
              opacity: Math.max(0, 1 - p * 1.8),
              marginBottom: `${Math.max(0, (1 - p) * 2)}px`,
              overflow: 'hidden'
            }}
            className={`text-[10px] uppercase font-bold tracking-wider truncate ${
              filterType === 'all' ? 'text-white/80' : textSecondary
            }`}
          >
            {labelPrefix ? labelPrefix : 'Tổng số ca'}
          </div>

          {/* Dòng chỉ số - chuyển sang inline khi cuộn */}
          <div
            style={{ fontSize: `${Math.round(15 - p * 2.5)}px` }}
            className="font-extrabold leading-tight flex items-center justify-center"
          >
            <span
              style={{
                opacity: Math.min(1, Math.max(0, (p - 0.2) / 0.7)),
                maxWidth: `${p * 50}px`,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                marginRight: `${p * 4}px`
              }}
              className="text-[11px] font-bold"
            >
              Tất cả
            </span>
            <span className={filterType === 'all' ? 'text-white' : textPrimary}>
              {totalCount}
            </span>
            <span
              style={{
                opacity: Math.max(0, 1 - p * 1.8),
                maxWidth: `${(1 - p) * 18}px`,
                overflow: 'hidden',
                marginLeft: `${(1 - p) * 3}px`
              }}
              className={`text-[11px] font-normal ${filterType === 'all' ? 'text-white/80' : textSecondary}`}
            >
              ca
            </span>
          </div>
        </div>
      </button>

      {/* ----------------------------------------------------------- */}
      {/* 2. TÔI                                                      */}
      {/* ----------------------------------------------------------- */}
      <button
        type="button"
        onClick={() => onFilterChange?.('owner')}
        style={{
          backgroundColor: filterType === 'owner' ? accentConfig.hex : undefined,
          borderColor: filterType === 'owner' ? accentConfig.hex : undefined,
          color: filterType === 'owner' ? '#FFFFFF' : undefined,
          paddingTop: `${Math.round(6 - p * 2.5)}px`,
          paddingBottom: `${Math.round(6 - p * 2.5)}px`,
          borderRadius: `${Math.round(12 - p * 2)}px`
        }}
        className={`px-2 text-center border cursor-pointer active:scale-[0.98] ${
          filterType === 'owner'
            ? 'shadow-xs'
            : `${cardBg} hover:opacity-90`
        }`}
      >
        <div className="flex flex-col items-center justify-center text-center">
          {/* Label trên */}
          <div
            style={{
              height: `${Math.max(0, (1 - p) * 14)}px`,
              opacity: Math.max(0, 1 - p * 1.8),
              marginBottom: `${Math.max(0, (1 - p) * 2)}px`,
              overflow: 'hidden'
            }}
            className={`text-[10px] uppercase font-bold tracking-wider truncate flex items-center justify-center gap-0.5 ${
              filterType === 'owner' ? 'text-white/80' : textSecondary
            }`}
          >
            <span>👑</span> Tôi
          </div>

          {/* Dòng chỉ số */}
          <div
            style={{ fontSize: `${Math.round(15 - p * 2.5)}px` }}
            className="font-extrabold leading-tight flex items-center justify-center"
          >
            <span
              style={{
                opacity: Math.min(1, Math.max(0, (p - 0.2) / 0.7)),
                maxWidth: `${p * 50}px`,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                marginRight: `${p * 4}px`
              }}
              className="text-[11px] font-bold"
            >
              👑 Tôi
            </span>
            <span
              style={{
                color: filterType === 'owner' ? '#FFFFFF' : accentConfig.hex
              }}
            >
              {ownerCount}
            </span>
            <span
              style={{
                opacity: Math.max(0, 1 - p * 1.8),
                maxWidth: `${(1 - p) * 18}px`,
                overflow: 'hidden',
                marginLeft: `${(1 - p) * 3}px`
              }}
              className={`text-[11px] font-normal ${filterType === 'owner' ? 'text-white/80' : textSecondary}`}
            >
              ca
            </span>
          </div>
        </div>
      </button>

      {/* ----------------------------------------------------------- */}
      {/* 3. CTV                                                      */}
      {/* ----------------------------------------------------------- */}
      <button
        type="button"
        onClick={() => onFilterChange?.('ctv')}
        style={{
          paddingTop: `${Math.round(6 - p * 2.5)}px`,
          paddingBottom: `${Math.round(6 - p * 2.5)}px`,
          borderRadius: `${Math.round(12 - p * 2)}px`
        }}
        className={`px-2 text-center border cursor-pointer active:scale-[0.98] ${
          filterType === 'ctv'
            ? 'bg-[#5856D6] text-white border-[#5856D6] shadow-xs'
            : `${cardBg} hover:opacity-90`
        }`}
      >
        <div className="flex flex-col items-center justify-center text-center">
          {/* Label trên */}
          <div
            style={{
              height: `${Math.max(0, (1 - p) * 14)}px`,
              opacity: Math.max(0, 1 - p * 1.8),
              marginBottom: `${Math.max(0, (1 - p) * 2)}px`,
              overflow: 'hidden'
            }}
            className={`text-[10px] uppercase font-bold tracking-wider truncate flex items-center justify-center gap-0.5 ${
              filterType === 'ctv' ? 'text-white/80' : textSecondary
            }`}
          >
            <span>🤝</span> CTV
          </div>

          {/* Dòng chỉ số */}
          <div
            style={{ fontSize: `${Math.round(15 - p * 2.5)}px` }}
            className="font-extrabold leading-tight flex items-center justify-center"
          >
            <span
              style={{
                opacity: Math.min(1, Math.max(0, (p - 0.2) / 0.7)),
                maxWidth: `${p * 50}px`,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                marginRight: `${p * 4}px`
              }}
              className="text-[11px] font-bold"
            >
              🤝 CTV
            </span>
            <span
              className={filterType === 'ctv' ? 'text-white' : 'text-[#5856D6]'}
            >
              {ctvCount}
            </span>
            <span
              style={{
                opacity: Math.max(0, 1 - p * 1.8),
                maxWidth: `${(1 - p) * 18}px`,
                overflow: 'hidden',
                marginLeft: `${(1 - p) * 3}px`
              }}
              className={`text-[11px] font-normal ${filterType === 'ctv' ? 'text-white/80' : textSecondary}`}
            >
              ca
            </span>
          </div>
        </div>
      </button>
    </div>
  );
};
