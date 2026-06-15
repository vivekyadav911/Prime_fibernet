import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export type BillingStatus = 'paid' | 'pending' | 'overdue' | 'suspended';

const CONFIG: Record<BillingStatus, { label: string; bg: string; text: string; border: string }> = {
  paid: { label: 'Paid', bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
  pending: { label: 'Due', bg: '#FFF8E1', text: '#F57F17', border: '#FFE082' },
  overdue: { label: 'Overdue', bg: '#FFEBEE', text: colors.errorRed, border: '#FFCDD2' },
  suspended: { label: 'Suspended', bg: '#ECEFF1', text: colors.textSecondary, border: colors.borderDefault },
};

type Props = { status: BillingStatus };

export function BillingStatusBadge({ status }: Props) {
  const cfg = CONFIG[status] ?? CONFIG.pending;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Text style={[styles.text, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  text: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
});
