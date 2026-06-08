import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

const PRIORITY_COLORS: Record<string, string> = {
  P0: colors.errorRed,
  P1: colors.warningAmber,
  P2: colors.accentTeal,
  P3: colors.textSecondary,
};

type PriorityBadgeProps = { priority: string };

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const color = PRIORITY_COLORS[priority] ?? colors.textSecondary;

  return (
    <View style={[styles.badge, { backgroundColor: `${color}22`, borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{priority}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 11, fontWeight: '700' },
});
