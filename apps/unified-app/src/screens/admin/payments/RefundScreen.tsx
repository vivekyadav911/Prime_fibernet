import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { AmountDisplay } from '@/components/payments';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { usePaymentDetail } from '@/hooks/usePayments';
import { useInitiateRefundV2Mutation } from '@/services/api/paymentCollectionApi';
import type { AdminPaymentsStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminPaymentsStackParamList, 'Refund'>;

export function RefundScreen({ route, navigation }: Props) {
  const { paymentId } = route.params;
  const { data: payment, isLoading, isError, error, refetch } = usePaymentDetail(paymentId);
  const [initiateRefund, { isLoading: refunding }] = useInitiateRefundV2Mutation();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const onSubmit = useCallback(async () => {
    if (!payment) return;
    const parsed = Number(amount) || payment.total_amount;
    if (reason.trim().length < 20) {
      Alert.alert('Reason required', 'Enter at least 20 characters.');
      return;
    }
    try {
      await initiateRefund({ paymentId, amount: parsed, reason: reason.trim() }).unwrap();
      Alert.alert('Refund initiated', 'Refund record created.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Refund failed');
    }
  }, [amount, initiateRefund, navigation, payment, paymentId, reason]);

  if (isLoading) return <Screen><SkeletonLoader rows={4} /></Screen>;
  if (isError || !payment) {
    return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;
  }

  return (
    <Screen style={[adminScreenStyles.canvas, styles.screenPadding]}>
      <Text style={styles.title}>Refund — {payment.payment_number}</Text>
      <AmountDisplay amount={payment.total_amount} large />
      <Text style={styles.label}>REFUND AMOUNT</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={amount || String(payment.total_amount)}
        onChangeText={setAmount}
        placeholderTextColor={colors.textSecondary}
      />
      <Text style={styles.label}>REASON (min 20 chars)</Text>
      <TextInput
        style={[styles.input, styles.notes]}
        multiline
        value={reason}
        onChangeText={setReason}
        placeholderTextColor={colors.textSecondary}
      />
      <Button label="Initiate refund" onPress={onSubmit} disabled={refunding} />
    </Screen>
  );
}

const styles = StyleSheet.create({  screenPadding: { padding: spacing.md },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    color: colors.textPrimary,
  },
  notes: { minHeight: 100, textAlignVertical: 'top' },
});
