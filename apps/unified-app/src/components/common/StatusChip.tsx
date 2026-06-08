import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

const STATUS_COLORS: Record<string, string> = {
  pending: colors.warningAmber,
  assigned: colors.accentTeal,
  in_progress: colors.accentTeal,
  working: colors.accentTeal,
  awaiting_customer: colors.warningAmber,
  completed: colors.successGreen,
  resolved: colors.successGreen,
  cancelled: colors.textSecondary,
  active: colors.successGreen,
  expired: colors.errorRed,
  success: colors.successGreen,
  failed: colors.errorRed,
  refunded: colors.textSecondary,
};

type StatusChipProps = { status: string };

export function StatusChip({ status }: StatusChipProps) {
  const color = STATUS_COLORS[status] ?? colors.textSecondary;
  const label = status.replace(/_/g, ' ');

  return (
    <View style={[styles.chip, { borderColor: color, backgroundColor: `${color}18` }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
});
