import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { useCustomerUiStore } from '@/store/customerUiStore';
import {
  appearanceFromDarkMode,
  getCustomerTheme,
  type CustomerAppearance,
  type CustomerTheme,
} from '@/theme/customer';

type CustomerThemeContextValue = {
  theme: CustomerTheme;
  isDark: boolean;
  appearance: CustomerAppearance;
  setDarkMode: (value: boolean) => void;
  toggleAppearance: () => void;
};

const CustomerThemeContext = createContext<CustomerThemeContextValue | null>(null);

type CustomerThemeProviderProps = {
  children: ReactNode;
};

export function CustomerThemeProvider({ children }: CustomerThemeProviderProps) {
  const isDark = useCustomerUiStore((s) => s.darkMode);
  const setDarkMode = useCustomerUiStore((s) => s.setDarkMode);

  const value = useMemo<CustomerThemeContextValue>(
    () => ({
      theme: getCustomerTheme(isDark),
      isDark,
      appearance: appearanceFromDarkMode(isDark),
      setDarkMode,
      toggleAppearance: () => setDarkMode(!isDark),
    }),
    [isDark, setDarkMode],
  );

  return <CustomerThemeContext.Provider value={value}>{children}</CustomerThemeContext.Provider>;
}

export function useCustomerTheme(): CustomerThemeContextValue {
  const ctx = useContext(CustomerThemeContext);
  if (!ctx) {
    throw new Error('useCustomerTheme must be used within CustomerThemeProvider');
  }
  return ctx;
}
