import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import type { AppSettings, ThemeMode } from '@/types/settings';

type ColorSchemeKey = 'purple' | 'blue' | 'green' | 'orange';

const SCHEME_ACCENTS: Record<ColorSchemeKey, string> = {
  purple: adminColors.primary,
  blue: '#3B82F6',
  green: '#10B981',
  orange: '#F59E0B',
};

type AppTheme = {
  mode: ThemeMode;
  colorScheme: ColorSchemeKey;
  fontSize: number;
  compactMode: boolean;
  animationsEnabled: boolean;
  accent: string;
  canvasBg: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
};

type ThemeContextValue = {
  theme: AppTheme;
  applyFromSettings: (settings: Partial<AppSettings>) => void;
};

const defaultTheme: AppTheme = {
  mode: 'system',
  colorScheme: 'purple',
  fontSize: 14,
  compactMode: false,
  animationsEnabled: true,
  accent: adminColors.primary,
  canvasBg: adminColors.canvasBg,
  cardBg: adminColors.cardBg,
  textPrimary: colors.textPrimary,
  textSecondary: colors.textSecondary,
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme,
  applyFromSettings: () => undefined,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>(defaultTheme);

  const applyFromSettings = useCallback((settings: Partial<AppSettings>) => {
    setTheme((prev) => {
      const scheme = (settings.colorScheme as ColorSchemeKey) ?? prev.colorScheme;
      const accent = SCHEME_ACCENTS[scheme] ?? adminColors.primary;
      return {
        ...prev,
        mode: settings.themeMode ?? prev.mode,
        colorScheme: scheme,
        fontSize: settings.fontSize ?? prev.fontSize,
        compactMode: settings.compactMode ?? prev.compactMode,
        animationsEnabled: settings.animationsEnabled ?? prev.animationsEnabled,
        accent,
      };
    });
  }, []);

  const value = useMemo(() => ({ theme, applyFromSettings }), [theme, applyFromSettings]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
