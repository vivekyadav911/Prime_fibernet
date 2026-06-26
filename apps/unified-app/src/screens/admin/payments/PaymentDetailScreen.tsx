import { AdminScreenLayout } from '@/components/admin';
import { useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { AmountDisplay, MethodIcon, PaymentTimeline, PaymentStatusBadge } from '@/components/payments';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { usePaymentDetail } from '@/hooks/usePayments';
import { useLazyGetPaymentReceiptQuery } from '@/services/api/paymentCollectionApi';
import type { AdminPaymentsStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminPaymentsStackParamList, 'PaymentDetail'>;

export function PaymentDetailScreen({ route, navigation }: Props) {
  const { paymentId } = route.params;
  const { data: payment, isLoading, isError, error, refetch } = usePaymentDetail(paymentId);
  const [fetchReceipt] = useLazyGetPaymentReceiptQuery();

  const onReceipt = useCallback(async () => {
    try {
      const result = await fetchReceipt(paymentId).unwrap();
      Alert.alert('Receipt', result.receiptNumber || 'Generated');
    } catch (e) {
      Alert.alert('Receipt', e instanceof Error ? e.message : 'Could not generate receipt');
    }
  }, [fetchReceipt, paymentId]);

  if (isLoading) return <Screen><SkeletonLoader rows={8} /></Screen>;
  if (isError || !payment) {
    return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;
  }

  return (
    <AdminScreenLayout>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.number}>{payment.payment_number}</Text>
          <PaymentStatusBadge status={payment.status} />
        </View>
        <View style={styles.card}>
          <Text style={styles.section}>Customer</Text>
          <Text style={styles.line}>{payment.customer_name} · {payment.account_number}</Text>
          {payment.customer_phone ? <Text style={styles.muted}>{payment.customer_phone}</Text> : null}
          {payment.plan_name ? <Text style={styles.muted}>Plan: {payment.plan_name}</Text> : null}
        </View>
        <View style={styles.card}>
          <Text style={styles.section}>Payment</Text>
          <AmountDisplay amount={payment.total_amount} large />
          <MethodIcon method={payment.method} />
          {payment.gateway_slug ? <Text style={styles.muted}>Gateway: {payment.gateway_slug}</Text> : null}
        </View>
        {payment.gateway_raw_response ? (
          <View style={styles.card}>
            <Text style={styles.section}>Gateway Response</Text>
            <Text style={styles.mono}>Order: {payment.gateway_order_id}</Text>
            <Text style={styles.mono}>Payment ID: {payment.gateway_payment_id}</Text>
          </View>
        ) : null}
        <View style={styles.card}>
          <Text style={styles.section}>Timeline</Text>
          <PaymentTimeline payment={payment} />
        </View>
        {(payment.status === 'pending_review' || payment.status === 'cash_collected') && (
          <Button
            label="Review payment"
            onPress={() => navigation.navigate('PaymentReview', { paymentId })}
          />
        )}
        {payment.status === 'confirmed' && (
          <Button label="Download receipt" variant="secondary" onPress={onReceipt} />
        )}
        {payment.status === 'confirmed' && (
          <Button
            label="Initiate refund"
            variant="ghost"
            onPress={() => navigation.navigate('Refund', { paymentId })}
          />
        )}
      </ScrollView>
    </AdminScreenLayout>
  );
}

const styles = StyleSheet.create({  screenPadding: { padding: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  number: { fontFamily: 'monospace', fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  section: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: spacing.sm },
  line: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  muted: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  mono: { fontFamily: 'monospace', fontSize: 12, color: colors.textPrimary, marginBottom: 4 },
});
