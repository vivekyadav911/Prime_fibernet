import { StyleSheet, Text, View } from 'react-native';

import type { PaymentRecord } from '@/types/payments';
import { PaymentStatusBadge } from './StatusBadge';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Step = { label: string; at: string | null; status?: PaymentRecord['status'] };

type Props = { payment: PaymentRecord };

export function PaymentTimeline({ payment }: Props) {
  const steps: Step[] = [
    { label: 'Initiated', at: payment.initiated_at },
    { label: 'Paid / Collected', at: payment.paid_at },
    { label: 'Pending Review', at: payment.status === 'pending_review' ? payment.paid_at : null, status: 'pending_review' as const },
    { label: 'Confirmed', at: payment.confirmed_at, status: 'confirmed' as const },
  ].filter((s) => s.at);

  return (
    <View style={styles.wrap}>
      {steps.map((step) => (
        <View key={step.label} style={styles.row}>
          <View style={styles.dot} />
          <View style={styles.content}>
            <Text style={styles.label}>{step.label}</Text>
            <Text style={styles.time}>{step.at ? new Date(step.at).toLocaleString() : '—'}</Text>
            {step.status ? <PaymentStatusBadge status={step.status} /> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentTeal,
    marginTop: 4,
  },
  content: { flex: 1, gap: 4 },
  label: { fontWeight: '600', color: colors.textPrimary },
  time: { fontSize: 12, color: colors.textSecondary },
});
