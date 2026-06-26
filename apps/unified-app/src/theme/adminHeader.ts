import type { TextStyle, ViewStyle } from 'react-native';

import { adminColors } from '@/theme/admin';
import { spacing, radius } from '@/theme/spacing';

/** Shared admin app-bar tokens — single source for all admin top bars. */
export const adminHeaderTheme = {
  background: adminColors.primary,
  foreground: '#FFFFFF',
  iconButtonBg: 'rgba(255, 255, 255, 0.14)',
  rowHeight: 56,
  horizontalPadding: spacing.lg,
  edgeInset: spacing.sm,
  iconSize: 22,
  buttonSize: 40,
  titleFontSize: 20,
  subtitleFontSize: 13,
} as const;

export const adminHeaderTitleStyle: TextStyle = {
  fontSize: adminHeaderTheme.titleFontSize,
  fontWeight: '600',
  color: adminHeaderTheme.foreground,
};

export const adminHeaderSubtitleStyle: TextStyle = {
  fontSize: adminHeaderTheme.subtitleFontSize,
  fontWeight: '500',
  color: 'rgba(255, 255, 255, 0.72)',
};

export const adminHeaderBarStyle: ViewStyle = {
  backgroundColor: adminHeaderTheme.background,
};

export const adminHeaderIconButtonStyle: ViewStyle = {
  width: adminHeaderTheme.buttonSize,
  height: adminHeaderTheme.buttonSize,
  borderRadius: radius.full,
  backgroundColor: adminHeaderTheme.iconButtonBg,
  alignItems: 'center',
  justifyContent: 'center',
};

export const adminHeaderLeftContainerStyle: ViewStyle = {
  paddingStart: adminHeaderTheme.edgeInset,
  paddingEnd: 0,
  alignItems: 'center',
  justifyContent: 'center',
  alignSelf: 'stretch',
};

export const adminHeaderRightContainerStyle: ViewStyle = {
  paddingStart: 0,
  paddingEnd: adminHeaderTheme.edgeInset,
  alignItems: 'center',
  justifyContent: 'center',
  alignSelf: 'stretch',
};
