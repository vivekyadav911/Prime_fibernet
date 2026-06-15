import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AmountDisplay } from './AmountDisplay';
import { MethodIcon } from './MethodIcon';
import { PaymentStatusBadge } from './StatusBadge';
import type { PaymentRecord, PaymentStatus } from '@/types/payments';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type Props = {
  payment: PaymentRecord;
  onPress: () => void;
  actionLabel?: string;
};

function actionForStatus(status: PaymentStatus): string {
  if (status === 'pending_review') return 'Review';
  if (status === 'cash_collected') return 'Confirm Cash';
  if (status === 'confirmed') return 'View';
  if (status === 'failed') return 'View';
  return 'View';
}

export function PaymentCard({ payment, onPress, actionLabel }: Props) {
  const cta = actionLabel ?? actionForStatus(payment.status);
  const isReview = payment.status === 'pending_review' || payment.status === 'cash_collected';

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.number}>{payment.payment_number || 'Pending'}</Text>
        <PaymentStatusBadge status={payment.status} />
      </View>
      <Text style={styles.customer}>
        {payment.customer_name} · {payment.account_number}
      </Text>
      <View style={styles.footer}>
        <View>
          <AmountDisplay amount={payment.total_amount} large />
          <MethodIcon method={payment.method} />
          {payment.gateway_slug ? (
            <Text style={styles.gateway}>{payment.gateway_slug}</Text>
          ) : null}
        </View>
        <View style={[styles.cta, isReview && styles.ctaReview]}>
          <Text style={[styles.ctaText, isReview && styles.ctaTextReview]}>{cta} →</Text>
        </View>
      </View>
      <Text style={styles.date}>{new Date(payment.created_at).toLocaleString()}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  number: { fontFamily: 'monospace', fontWeight: '700', fontSize: 14, color: colors.textPrimary },
  customer: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: spacing.sm },
  gateway: { fontSize: 11, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  cta: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  ctaReview: { backgroundColor: adminColors.navPillWarningBg, borderRadius: radius.sm },
  ctaText: { fontWeight: '600', color: colors.textSecondary, fontSize: 13 },
  ctaTextReview: { color: adminColors.navPillWarningText },
  date: { marginTop: spacing.xs, fontSize: 11, color: colors.textSecondary },
});
