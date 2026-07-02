import { StyleSheet, Text, View } from 'react-native';

import type { PaymentActivityEvent, PaymentRecord } from '@/types/payments';
import { PaymentStatusBadge } from './StatusBadge';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Step = {
  label: string;
  at: string | null;
  status?: PaymentRecord['status'] | string | null;
};

type Props = {
  payment: PaymentRecord;
  activityEvents?: PaymentActivityEvent[];
};

function buildFallbackSteps(payment: PaymentRecord): Step[] {
  const steps: Step[] = [
    { label: 'Initiated', at: payment.initiated_at },
    { label: 'Paid / Collected', at: payment.paid_at },
    {
      label: 'Pending Review',
      at: payment.status === 'pending_review' || payment.status === 'cash_collected' ? payment.paid_at : null,
      status: 'pending_review',
    },
    { label: 'Confirmed', at: payment.confirmed_at, status: 'confirmed' },
    {
      label: 'Refunded',
      at: payment.status === 'refunded' ? payment.updated_at : null,
      status: 'refunded',
    },
  ];
  return steps.filter((s) => s.at);
}

export function PaymentTimeline({ payment, activityEvents }: Props) {
  const steps: Step[] =
    activityEvents && activityEvents.length > 0
      ? activityEvents.map((event) => ({
          label: event.title,
          at: event.created_at,
          status: (event.status as PaymentRecord['status']) ?? null,
        }))
      : buildFallbackSteps(payment);

  return (
    <View style={styles.wrap}>
      {steps.map((step, index) => (
        <View key={`${step.label}-${index}`} style={styles.row}>
          <View style={styles.dot} />
          <View style={styles.content}>
            <Text style={styles.label}>{step.label}</Text>
            <Text style={styles.time}>{step.at ? new Date(step.at).toLocaleString() : '—'}</Text>
            {step.status ? (
              <PaymentStatusBadge status={step.status as PaymentRecord['status']} />
            ) : null}
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
