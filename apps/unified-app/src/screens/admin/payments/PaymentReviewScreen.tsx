import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { DateField } from '@/components/admin';
import { AmountDisplay, DenominationInput, MethodIcon } from '@/components/payments';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { usePaymentDetail } from '@/hooks/usePayments';
import {
  useConfirmPaymentV2Mutation,
  useRejectPaymentV2Mutation,
} from '@/services/api/paymentCollectionApi';
import { computeNextDueDate } from '@/utils/nextDueDate';
import type { AdminPaymentsStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminPaymentsStackParamList, 'PaymentReview'>;

export function PaymentReviewScreen({ route, navigation }: Props) {
  const { paymentId } = route.params;
  const { data: payment, isLoading, isError, error, refetch } = usePaymentDetail(paymentId);
  const [confirmPayment, { isLoading: confirming }] = useConfirmPaymentV2Mutation();
  const [rejectPayment, { isLoading: rejecting }] = useRejectPaymentV2Mutation();

  const [nextDueDate, setNextDueDate] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [denominations, setDenominations] = useState<Record<string, number>>({
    '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0,
  });

  const isCash = payment?.status === 'cash_collected';

  const defaultDue = useMemo(() => computeNextDueDate(1), []);

  const onConfirm = useCallback(async () => {
    if (!payment) return;
    const due = nextDueDate || defaultDue;
    try {
      await confirmPayment({
        paymentId,
        nextDueDate: due,
        reviewNotes: reviewNotes.trim() || undefined,
        cashDenominations: isCash ? denominations : undefined,
        receiptNumber: isCash ? receiptNumber.trim() || undefined : undefined,
      }).unwrap();
      Alert.alert('Confirmed', 'Payment confirmed and customer updated.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not confirm');
    }
  }, [confirmPayment, defaultDue, denominations, isCash, navigation, nextDueDate, payment, paymentId, receiptNumber, reviewNotes]);

  const onReject = useCallback(async () => {
    if (!reviewNotes.trim()) {
      Alert.alert('Notes required', 'Add review notes explaining rejection.');
      return;
    }
    try {
      await rejectPayment({ paymentId, reason: reviewNotes.trim() }).unwrap();
      Alert.alert('Rejected', 'Payment marked as cancelled.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not reject');
    }
  }, [navigation, paymentId, rejectPayment, reviewNotes]);

  if (isLoading) return <Screen><SkeletonLoader rows={8} /></Screen>;
  if (isError || !payment) {
    return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Review — {payment.payment_number}</Text>
        <View style={styles.card}>
          <Text style={styles.customer}>{payment.customer_name} · {payment.account_number}</Text>
          <AmountDisplay amount={payment.total_amount} large />
          <MethodIcon method={payment.method} />
        </View>

        {isCash ? (
          <View style={styles.card}>
            <Text style={styles.section}>Denomination count</Text>
            <DenominationInput
              denominations={denominations}
              expectedAmount={payment.total_amount}
              onChange={setDenominations}
            />
            <Text style={styles.label}>PHYSICAL RECEIPT NUMBER</Text>
            <TextInput
              style={styles.input}
              value={receiptNumber}
              onChangeText={setReceiptNumber}
              placeholder="RCT-2026-0421"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.section}>Gateway response</Text>
            <Text style={styles.mono}>Order: {payment.gateway_order_id}</Text>
            <Text style={styles.mono}>Payment ID: {payment.gateway_payment_id}</Text>
          </View>
        )}

        <View style={styles.card}>
          <DateField
            label="Next due date"
            value={nextDueDate || defaultDue}
            onChange={setNextDueDate}
            accentColor={adminColors.primary}
          />
          <Text style={styles.label}>REVIEW NOTES</Text>
          <TextInput
            style={[styles.input, styles.notes]}
            value={reviewNotes}
            onChangeText={setReviewNotes}
            multiline
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.actions}>
          <Button label="Reject" variant="secondary" onPress={onReject} loading={rejecting} />
          <Button
            label={isCash ? 'Confirm & receipt' : 'Confirm payment'}
            onPress={onConfirm}
            loading={confirming}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: adminColors.canvasBg },
  content: { padding: spacing.md, gap: spacing.sm },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  customer: { fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  section: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: spacing.sm },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    color: colors.textPrimary,
  },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  mono: { fontFamily: 'monospace', fontSize: 12, color: colors.textPrimary },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
