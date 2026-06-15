import { useCallback } from 'react';
import { Alert, ScrollView, Share, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { ReceiptTemplate } from '@/components/payments';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { usePaymentDetail } from '@/hooks/usePayments';
import { useLazyGetPaymentReceiptQuery } from '@/services/api/paymentCollectionApi';
import type { CustomerStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<CustomerStackParamList, 'Receipt'>;

export function ReceiptScreen({ route }: Props) {
  const { paymentId } = route.params;
  const { data: payment, isLoading, isError, error, refetch } = usePaymentDetail(paymentId);
  const [fetchReceipt, { data: receipt }] = useLazyGetPaymentReceiptQuery();

  const onDownload = useCallback(async () => {
    try {
      const result = await fetchReceipt(paymentId).unwrap();
      if (result.url) {
        await Share.share({ url: result.url, message: `Receipt ${result.receiptNumber}` });
      }
    } catch (e) {
      Alert.alert('Download failed', e instanceof Error ? e.message : 'Try again');
    }
  }, [fetchReceipt, paymentId]);

  if (isLoading) return <Screen><SkeletonLoader rows={4} /></Screen>;
  if (isError || !payment) {
    return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;
  }

  const billingPeriod =
    payment.billing_period_start && payment.billing_period_end
      ? `${payment.billing_period_start} – ${payment.billing_period_end}`
      : null;

  return (
    <Screen style={styles.screen}>
      <ScrollView>
        <ReceiptTemplate
          companyName="Prime Fibernet"
          receiptNumber={receipt?.receiptNumber ?? payment.payment_number}
          customerName={payment.customer_name}
          accountNumber={payment.account_number}
          planName={payment.plan_name}
          totalAmount={payment.total_amount}
          paymentMethod={payment.method}
          paymentDate={payment.confirmed_at ?? payment.paid_at ?? payment.created_at}
          billingPeriod={billingPeriod}
          nextDueDate={payment.next_due_date}
        />
      </ScrollView>
      {payment.status === 'confirmed' && (
        <Button label="Share receipt" onPress={onDownload} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.md, backgroundColor: colors.background },
});
