import { AdminButton, AdminScreenLayout, AdminStateShell } from '@/components/admin';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AmountDisplay } from '@/components/payments';
import { usePaymentDetail } from '@/hooks/usePayments';
import { useInitiateRefundV2Mutation } from '@/services/api/paymentCollectionApi';
import type { AdminPaymentsStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

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

  return (
    <AdminStateShell
      isLoading={isLoading}
      isError={isError || !payment}
      error={error}
      onRetry={refetch}
      loadingRows={4}
    >
      <AdminScreenLayout scroll contentStyle={styles.content}>
        <Text style={styles.title}>Refund — {payment!.payment_number}</Text>
        <AmountDisplay amount={payment!.total_amount} large />
        <Text style={styles.label}>REFUND AMOUNT</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={amount || String(payment!.total_amount)}
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
        <AdminButton label="Initiate refund" onPress={onSubmit} disabled={refunding} style={styles.submit} />
      </AdminScreenLayout>
    </AdminStateShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    color: colors.textPrimary,
  },
  notes: { minHeight: 100, textAlignVertical: 'top', marginBottom: spacing.xs },
  submit: { marginTop: spacing.sm, alignSelf: 'stretch' },
});
