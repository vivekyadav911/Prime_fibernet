import { primeLight } from './primeLight';
import { signalGlass } from './signalGlass';
import type { CustomerTheme } from './types';

export type { CustomerTheme, CustomerThemeColors } from './types';
export { signalGlass, primeLight };

export type CustomerAppearance = 'dark' | 'light';

export function getCustomerTheme(isDark: boolean): CustomerTheme {
  return isDark ? signalGlass : primeLight;
}

export function appearanceFromDarkMode(isDark: boolean): CustomerAppearance {
  return isDark ? 'dark' : 'light';
}
