import { StyleSheet, Text, View } from 'react-native';

import { adminColors } from '@/theme/admin';
import { spacing } from '@/theme/spacing';
import type { TicketPriority } from '@/types/tickets';

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  Critical: adminColors.badgeDanger,
  High: '#F97316',
  Medium: adminColors.badgeWarning,
  Low: adminColors.badgeActive,
};

type PriorityBadgeProps = {
  priority: TicketPriority;
  compact?: boolean;
};

export function PriorityBadge({ priority, compact }: PriorityBadgeProps) {
  const color = PRIORITY_COLORS[priority];
  return (
    <View style={[styles.badge, compact && styles.compact, { backgroundColor: `${color}22` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{priority}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 999,
  },
  compact: { paddingHorizontal: spacing.xs },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 11, fontWeight: '700' },
});
