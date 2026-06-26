import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type CustomerBadgeProps = {
  label: string;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
};

function getToneColors(theme: CustomerTheme): Record<Tone, { bg: string; text: string }> {
  return {
    success: { bg: 'rgba(16,185,129,0.2)', text: theme.colors.accentSuccess },
    warning: { bg: 'rgba(245,158,11,0.2)', text: theme.colors.accentWarning },
    danger: { bg: 'rgba(239,68,68,0.2)', text: theme.colors.accentDanger },
    info: { bg: 'rgba(59,130,246,0.2)', text: theme.colors.accentGlow },
    neutral: { bg: theme.colors.bgGlass, text: theme.colors.textSecondary },
  };
}

export function CustomerBadge({ label, tone = 'neutral', style }: CustomerBadgeProps) {
  const styles = useThemedStyles(createStyles);
  const toneColors = useThemedStyles(getToneColors);
  const palette = toneColors[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }, style]}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    badge: {
      alignSelf: 'flex-start',
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      fontFamily: theme.fonts.bodyMedium,
    },
  });
