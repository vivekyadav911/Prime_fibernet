import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminButton, AdminScreenLayout, DateField } from '@/components/admin';
import { AmountDisplay, DenominationInput, MethodIcon, PaymentStatusBadge } from '@/components/payments';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { usePaymentDetail } from '@/hooks/usePayments';
import {
  useConfirmPaymentV2Mutation,
  useRejectPaymentV2Mutation,
} from '@/services/api/paymentCollectionApi';
import type { PaymentRecord } from '@/types/payments';
import { computeNextDueDate } from '@/utils/nextDueDate';
import { hasPaymentText, paymentText } from '@/utils/paymentText';
import type { AdminPaymentsStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminPaymentsStackParamList, 'PaymentReview'>;

type ReviewBodyProps = {
  payment: PaymentRecord;
  paymentId: string;
  onDone: () => void;
};

function PaymentReviewBody({ payment, paymentId, onDone }: ReviewBodyProps) {
  const [confirmPayment, { isLoading: confirming }] = useConfirmPaymentV2Mutation();
  const [rejectPayment, { isLoading: rejecting }] = useRejectPaymentV2Mutation();

  const [nextDueDate, setNextDueDate] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [denominations, setDenominations] = useState<Record<string, number>>({
    '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0,
  });

  const isCash = payment.method === 'cash';
  const isOfficerPending = payment.status === 'pending_review' || payment.status === 'cash_collected';
  const upiRef = paymentText(payment.gateway_payment_id);
  const officerNotes = paymentText(payment.cash_collection_notes);
  const evidenceUrl = paymentText(payment.evidence_photo_url);
  const hasOfficerMeta =
    hasPaymentText(upiRef) || hasPaymentText(officerNotes) || hasPaymentText(evidenceUrl);
  const gatewayOrderId = paymentText(payment.gateway_order_id);

  const defaultDue = useMemo(() => computeNextDueDate(1), []);

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7333/ingest/e1cbfe88-dbfa-476e-aa64-46550e18bd51',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'bad3ec'},body:JSON.stringify({sessionId:'bad3ec',location:'PaymentReviewScreen.tsx:body',message:'review body mounted',data:{paymentId,status:payment.status,method:payment.method,isOfficerPending,hasOfficerMeta},timestamp:Date.now(),hypothesisId:'H3',runId:'pending-open-fix'})}).catch(()=>{});
  }, [hasOfficerMeta, isOfficerPending, payment.method, payment.status, paymentId]);
  // #endregion

  const onConfirm = useCallback(async () => {
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
      onDone();
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not confirm');
    }
  }, [confirmPayment, defaultDue, denominations, isCash, nextDueDate, onDone, paymentId, receiptNumber, reviewNotes]);

  const onDecline = useCallback(async () => {
    if (!reviewNotes.trim()) {
      Alert.alert('Notes required', 'Add review notes explaining why this payment is declined.');
      return;
    }
    try {
      await rejectPayment({ paymentId, reason: reviewNotes.trim() }).unwrap();
      Alert.alert('Declined', 'Payment marked as cancelled.');
      onDone();
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not decline');
    }
  }, [onDone, paymentId, rejectPayment, reviewNotes]);

  return (
    <AdminScreenLayout scroll contentStyle={styles.content}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Review — {payment.payment_number}</Text>
        <PaymentStatusBadge status={payment.status} />
      </View>

      {isOfficerPending ? (
        <Text style={styles.pendingBanner}>
          Officer collection awaiting your confirmation or decline.
        </Text>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.customer}>
          {payment.customer_name} · {payment.account_number}
        </Text>
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
          <Text style={styles.label}>PHYSICAL RECEIPT NUMBER (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            value={receiptNumber}
            onChangeText={setReceiptNumber}
            placeholder="RCT-2026-0421"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      ) : isOfficerPending ? (
        <View style={styles.card}>
          <Text style={styles.section}>Officer collection details</Text>
          {hasOfficerMeta ? (
            <>
              {hasPaymentText(upiRef) ? (
                <Text style={styles.mono}>UPI / reference: {upiRef}</Text>
              ) : null}
              {hasPaymentText(officerNotes) ? (
                <Text style={styles.mono}>Notes: {officerNotes}</Text>
              ) : null}
              {hasPaymentText(evidenceUrl) ? (
                <Pressable onPress={() => void Linking.openURL(evidenceUrl!)}>
                  <Text style={styles.link}>View evidence photo</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <Text style={styles.muted}>No extra reference, notes, or photo were attached.</Text>
          )}
        </View>
      ) : hasPaymentText(gatewayOrderId) ? (
        <View style={styles.card}>
          <Text style={styles.section}>Gateway response</Text>
          <Text style={styles.mono}>Order: {gatewayOrderId}</Text>
          {hasPaymentText(upiRef) ? (
            <Text style={styles.mono}>Payment ID: {upiRef}</Text>
          ) : null}
        </View>
      ) : null}

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
          placeholder="Required to decline; optional for confirm"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.actions}>
        <AdminButton label="Decline" variant="secondary" onPress={onDecline} disabled={rejecting} />
        <AdminButton label="Confirm payment" onPress={onConfirm} disabled={confirming} />
      </View>
    </AdminScreenLayout>
  );
}

export function PaymentReviewScreen({ route, navigation }: Props) {
  const { paymentId } = route.params;
  const { data: payment, isLoading, isError, error, refetch } = usePaymentDetail(paymentId);

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7333/ingest/e1cbfe88-dbfa-476e-aa64-46550e18bd51',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'bad3ec'},body:JSON.stringify({sessionId:'bad3ec',location:'PaymentReviewScreen.tsx:shell',message:'review screen state',data:{paymentId,isLoading,isError,hasPayment:Boolean(payment)},timestamp:Date.now(),hypothesisId:'H3',runId:'pending-open-fix'})}).catch(()=>{});
  }, [isError, isLoading, payment, paymentId]);
  // #endregion

  if (isLoading) {
    return (
      <AdminScreenLayout>
        <SkeletonLoader rows={8} />
      </AdminScreenLayout>
    );
  }

  if (isError || !payment) {
    return (
      <AdminScreenLayout>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </AdminScreenLayout>
    );
  }

  return (
    <PaymentReviewBody
      payment={payment}
      paymentId={paymentId}
      onDone={() => navigation.goBack()}
    />
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  pendingBanner: {
    fontSize: 13,
    color: colors.amber,
    fontWeight: '600',
    lineHeight: 18,
  },
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  customer: { fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  section: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
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
  muted: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  link: { fontSize: 13, fontWeight: '600', color: adminColors.primary, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
