import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { signalGlass } from '@/theme/customer/signalGlass';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type CustomerBadgeProps = {
  label: string;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
};

const toneColors: Record<Tone, { bg: string; text: string }> = {
  success: { bg: 'rgba(16,185,129,0.2)', text: signalGlass.colors.accentSuccess },
  warning: { bg: 'rgba(245,158,11,0.2)', text: signalGlass.colors.accentWarning },
  danger: { bg: 'rgba(239,68,68,0.2)', text: signalGlass.colors.accentDanger },
  info: { bg: 'rgba(59,130,246,0.2)', text: signalGlass.colors.accentGlow },
  neutral: { bg: signalGlass.colors.bgGlass, text: signalGlass.colors.textSecondary },
};

export function CustomerBadge({ label, tone = 'neutral', style }: CustomerBadgeProps) {
  const palette = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }, style]}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: signalGlass.radius.pill,
    paddingHorizontal: signalGlass.spacing.sm,
    paddingVertical: signalGlass.spacing.xs,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontFamily: signalGlass.fonts.bodyMedium,
  },
});
