import type { TextStyle, ViewStyle } from 'react-native';

import { officerColors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

/** Shared officer app-bar tokens — prevents header icon/title overlap. */
export const officerHeaderTheme = {
  background: officerColors.navBar,
  foreground: '#FFFFFF',
  rowHeight: 56,
  horizontalPadding: spacing.md,
  buttonSize: 44,
  titleFontSize: 20,
} as const;

export const officerHeaderTitleStyle: TextStyle = {
  fontSize: officerHeaderTheme.titleFontSize,
  fontWeight: '600',
  color: officerHeaderTheme.foreground,
};

export const officerHeaderBarStyle: ViewStyle = {
  backgroundColor: officerHeaderTheme.background,
};
