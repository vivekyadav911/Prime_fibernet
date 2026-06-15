import { StyleSheet, Text, View } from 'react-native';

import { PAYMENT_STATUS_CONFIG, type PaymentStatus } from '@/types/payments';
import { radius, spacing } from '@/theme/spacing';

type Props = { status: PaymentStatus };

export function PaymentStatusBadge({ status }: Props) {
  const cfg = PAYMENT_STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Text style={[styles.text, { color: cfg.text }]}>
        {cfg.icon} {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  text: { fontSize: 12, fontWeight: '600' },
});
