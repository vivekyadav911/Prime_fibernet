import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

export type CustomerStatusTone =
  | 'pending'
  | 'failed'
  | 'paid'
  | 'success'
  | 'current'
  | 'info'
  | 'neutral';

type CustomerStatusPillProps = {
  label: string;
  tone?: CustomerStatusTone;
  style?: StyleProp<ViewStyle>;
  showDot?: boolean;
};

type TonePalette = { bg: string; text: string; dot: string; glow?: boolean };

function getTonePalette(theme: CustomerTheme): Record<CustomerStatusTone, TonePalette> {
  return {
    pending: {
      bg: 'rgba(245,158,11,0.18)',
      text: theme.colors.accentWarning,
      dot: theme.colors.accentWarning,
    },
    failed: {
      bg: 'rgba(239,68,68,0.18)',
      text: theme.colors.accentDanger,
      dot: theme.colors.accentDanger,
    },
    paid: {
      bg: 'rgba(16,185,129,0.18)',
      text: theme.colors.accentSuccess,
      dot: theme.colors.accentSuccess,
    },
    success: {
      bg: 'rgba(16,185,129,0.18)',
      text: theme.colors.accentSuccess,
      dot: theme.colors.accentSuccess,
    },
    current: {
      bg: 'rgba(16,185,129,0.22)',
      text: theme.colors.accentSuccess,
      dot: theme.colors.accentSuccess,
      glow: true,
    },
    info: {
      bg: theme.colors.accentPrimaryMuted,
      text: theme.colors.primary,
      dot: theme.colors.primary,
    },
    neutral: {
      bg: theme.colors.bgGlass,
      text: theme.colors.textSecondary,
      dot: theme.colors.outline,
    },
  };
}

export function CustomerStatusPill({
  label,
  tone = 'neutral',
  style,
  showDot = true,
}: CustomerStatusPillProps) {
  const styles = useThemedStyles(createStyles);
  const palette = useThemedStyles(getTonePalette)[tone];

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: palette.bg },
        palette.glow ? [styles.glow, { shadowColor: palette.dot }] : null,
        style,
      ]}
    >
      {showDot ? <View style={[styles.dot, { backgroundColor: palette.dot }]} /> : null}
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      fontFamily: theme.fonts.bodyMedium,
    },
    glow: {
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
  });
