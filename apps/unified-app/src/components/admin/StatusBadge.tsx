import { StyleSheet, Text, View } from 'react-native';
import { adminColors } from '@/theme/admin';
import { radius, spacing } from '@/theme/spacing';

const STATUS_COLORS: Record<string, string> = {
  pending: adminColors.badgePending,
  active: adminColors.badgeActive,
  blocked: adminColors.badgeBlocked,
  success: adminColors.badgeActive,
  failed: adminColors.badgeBlocked,
  refunded: '#6B7280',
  paid: adminColors.badgeActive,
  unpaid: adminColors.badgePending,
  overdue: adminColors.badgeBlocked,
  present: adminColors.badgeActive,
  absent: adminColors.badgeBlocked,
  late: adminColors.badgeWarning,
  half_day: adminColors.badgeWarning,
  assigned: '#0D7377',
  in_progress: '#0D7377',
  completed: adminColors.badgeActive,
  resolved: adminColors.badgeActive,
  expired: adminColors.badgeBlocked,
  on_field: adminColors.badgeActive,
  busy: adminColors.badgeBlocked,
  available: '#0D7377',
  offline: '#6B7280',
};

type StatusBadgeProps = { status: string };

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = STATUS_COLORS[status.toLowerCase()] ?? '#6B7280';
  const label = status.replace(/_/g, ' ');

  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: `${color}18` }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
});
