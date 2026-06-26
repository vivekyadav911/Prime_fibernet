import { colors } from '@/theme/colors';

/** Shared switch track/thumb colors — off state is deliberately more visible than the OS default. */
export const switchTheme = {
  /** Track when off — slate-400, readable on white cards */
  trackOff: '#9CA3AF',
  /** iOS off-track background (without this, off toggles can look nearly white) */
  iosBackgroundOff: '#CBD5E1',
  thumb: colors.surfaceWhite,
  /** Common on-state accents */
  accentAdmin: '#5B4FE9',
  accentTeal: '#14B8A6',
  accentCustomer: colors.accentTeal,
} as const;
