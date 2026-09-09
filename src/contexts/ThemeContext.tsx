import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeMode, AccentColor } from '../types';
import {
  getThemeMode,
  setThemeMode,
  getAccentColor,
  setAccentColor,
  getCustomAccentHex,
  setCustomAccentHex
} from '../services/storageService';

export interface AccentColorItem {
  id: AccentColor;
  name: string;
  hex: string;
  hoverHex: string;
  lightBg: string;
  borderHex: string;
}

export function hexToRgba(hex: string, alpha: number): string {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  if (clean.length !== 6) {
    return `rgba(0, 122, 255, ${alpha})`;
  }
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const ACCENT_COLORS: Record<'blue' | 'purple' | 'pink' | 'orange' | 'green', AccentColorItem> = {
  blue: {
    id: 'blue',
    name: 'Xanh dương',
    hex: '#007AFF',
    hoverHex: '#0062CC',
    lightBg: 'rgba(0, 122, 255, 0.12)',
    borderHex: 'rgba(0, 122, 255, 0.25)'
  },
  purple: {
    id: 'purple',
    name: 'Tím',
    hex: '#AF52DE',
    hoverHex: '#9333EA',
    lightBg: 'rgba(175, 82, 222, 0.12)',
    borderHex: 'rgba(175, 82, 222, 0.25)'
  },
  pink: {
    id: 'pink',
    name: 'Hồng',
    hex: '#FF2D55',
    hoverHex: '#E02447',
    lightBg: 'rgba(255, 45, 85, 0.12)',
    borderHex: 'rgba(255, 45, 85, 0.25)'
  },
  orange: {
    id: 'orange',
    name: 'Cam',
    hex: '#FF9500',
    hoverHex: '#D97706',
    lightBg: 'rgba(255, 149, 0, 0.12)',
    borderHex: 'rgba(255, 149, 0, 0.25)'
  },
  green: {
    id: 'green',
    name: 'Xanh lá',
    hex: '#34C759',
    hoverHex: '#28A745',
    lightBg: 'rgba(52, 199, 89, 0.12)',
    borderHex: 'rgba(52, 199, 89, 0.25)'
  }
};

interface ThemeContextType {
  theme: ThemeMode;
  accent: AccentColor;
  customHex: string;
  accentConfig: AccentColorItem;
  setTheme: (mode: ThemeMode) => void;
  setAccent: (color: AccentColor) => void;
  setCustomColor: (hex: string) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setInternalTheme] = useState<ThemeMode>(() => getThemeMode());
  const [accent, setInternalAccent] = useState<AccentColor>(() => getAccentColor());
  const [customHex, setInternalCustomHex] = useState<string>(() => getCustomAccentHex());

  const accentConfig: AccentColorItem =
    accent === 'custom'
      ? {
          id: 'custom',
          name: 'Tự chọn',
          hex: customHex,
          hoverHex: customHex,
          lightBg: hexToRgba(customHex, 0.14),
          borderHex: hexToRgba(customHex, 0.3)
        }
      : ACCENT_COLORS[accent as keyof typeof ACCENT_COLORS] || ACCENT_COLORS.blue;

  const isDark = theme === 'dark';

  const handleSetTheme = (newMode: ThemeMode) => {
    setInternalTheme(newMode);
    setThemeMode(newMode);
  };

  const handleSetAccent = (newAccent: AccentColor) => {
    setInternalAccent(newAccent);
    setAccentColor(newAccent);
  };

  const handleSetCustomColor = (hex: string) => {
    const validHex = hex.startsWith('#') ? hex : `#${hex}`;
    setInternalCustomHex(validHex);
    setCustomAccentHex(validHex);
    setInternalAccent('custom');
    setAccentColor('custom');
  };

  // Synchronize CSS custom variables & class on root
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const headerBgColor = isDark ? '#1C1C1E' : '#FFFFFF';

    if (isDark) {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
    }

    root.style.backgroundColor = headerBgColor;
    body.style.backgroundColor = headerBgColor;

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', headerBgColor);
    }

    root.style.setProperty('--color-accent', accentConfig.hex);
    root.style.setProperty('--color-accent-hover', accentConfig.hoverHex);
    root.style.setProperty('--color-accent-light', accentConfig.lightBg);
    root.style.setProperty('--color-accent-border', accentConfig.borderHex);
  }, [theme, accentConfig, isDark]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        accent,
        customHex,
        accentConfig,
        setTheme: handleSetTheme,
        setAccent: handleSetAccent,
        setCustomColor: handleSetCustomColor,
        isDark
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
