import { Pressable, StyleSheet, Text, View } from 'react-native';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type StatsCardProps = {
  label: string;
  value: string | number;
  tone?: 'default' | 'danger' | 'warning' | 'success';
  onPress?: () => void;
};

const TONE_COLORS = {
  default: adminColors.kpiSurfaces.purple,
  danger: { bg: '#FEE2E2', icon: '#FECACA', accent: adminColors.badgeDanger },
  warning: { bg: '#FEF3C7', icon: '#FDE68A', accent: adminColors.badgeWarning },
  success: { bg: '#D1FAE5', icon: '#A7F3D0', accent: adminColors.badgeActive },
};

export function StatsCard({ label, value, tone = 'default', onPress }: StatsCardProps) {
  const surface = tone === 'default' ? TONE_COLORS.default : TONE_COLORS[tone];

  const content = (
    <View style={[styles.card, { backgroundColor: surface.bg }]}>
      <Text style={[styles.value, { color: surface.accent }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    width: 112,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  value: { fontSize: 20, fontWeight: '800' },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
});
