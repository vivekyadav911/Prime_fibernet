import type { TextStyle, ViewStyle } from 'react-native';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, shadow, spacing } from '@/theme/spacing';

/** App-wide admin layout and component constants — single source for screens and shared UI. */
export const adminDesign = {
  colors: {
    canvas: '#F4F5F7',
    surface: '#FFFFFF',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    border: '#E5E7EB',
    primary: '#5B4FE9',
    primaryDark: '#4A3FD4',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#0D7377',
    overlay: colors.overlay,
  },
  layout: {
    pagePadding: spacing.lg,
    sectionGap: spacing.md,
    cardPadding: spacing.md,
    cardGap: spacing.md,
    fieldGap: spacing.sm,
    labelGap: 6,
    listGap: spacing.md,
    minTouch: 44,
  },
  radius: {
    card: 22,
    input: radius.lg,
    button: radius.lg,
    chip: radius.full,
    sheet: radius.xl,
  },
  typography: {
    pageTitle: { fontSize: 21, fontWeight: '600', color: colors.textPrimary } satisfies TextStyle,
    sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary } satisfies TextStyle,
    cardTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.2 } satisfies TextStyle,
    body: { fontSize: 15, color: colors.textPrimary, lineHeight: 22 } satisfies TextStyle,
    bodySm: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 } satisfies TextStyle,
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    } satisfies TextStyle,
    meta: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 } satisfies TextStyle,
    kpiValue: {
      fontSize: 28,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
      letterSpacing: -0.5,
    } satisfies TextStyle,
  },
  input: {
    minHeight: 52,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
} as const;

export const adminCardStyle: ViewStyle = {
  backgroundColor: adminColors.cardBg,
  borderRadius: adminDesign.radius.card,
  borderWidth: 1,
  borderColor: colors.borderDefault,
  padding: adminDesign.layout.cardPadding,
  ...shadow.card,
};

export const adminInputStyle: ViewStyle = {
  minHeight: adminDesign.input.minHeight,
  borderWidth: 1,
  borderColor: colors.borderDefault,
  borderRadius: adminDesign.radius.input,
  paddingHorizontal: adminDesign.input.paddingHorizontal,
  paddingVertical: adminDesign.input.paddingVertical,
  backgroundColor: colors.surfaceWhite,
};
