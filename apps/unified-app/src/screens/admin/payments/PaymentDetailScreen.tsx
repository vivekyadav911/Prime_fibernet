import { AdminButton, AdminScreenLayout } from '@/components/admin';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { AmountDisplay, MethodIcon, PaymentTimeline, PaymentStatusBadge } from '@/components/payments';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { usePaymentDetail } from '@/hooks/usePayments';
import { useGetPaymentActivityTimelineQuery } from '@/services/api/paymentCollectionApi';
import { useGetInvoiceForPaymentQuery } from '@/services/api/adminFinanceApi';
import { usePollPaymentVerificationMutation } from '@/services/api/paymentsApi';
import type { AdminDrawerParamList, AdminPaymentsStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { formatPaymentCustomerLine } from '@/utils/formatPaymentCustomer';
import { hasPaymentText, paymentText } from '@/utils/paymentText';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminPaymentsStackParamList, 'PaymentDetail'>;

function CollectionMetadata({
  gatewayPaymentId,
  receiptNumber,
  notes,
  evidencePhotoUrl,
  latitude,
  longitude,
}: {
  gatewayPaymentId: string | null;
  receiptNumber: string | null;
  notes: string | null;
  evidencePhotoUrl: string | null;
  latitude?: number | null;
  longitude?: number | null;
}) {
  const collectionRef = paymentText(gatewayPaymentId) ?? paymentText(receiptNumber);
  const noteText = paymentText(notes);
  const evidenceUrl = paymentText(evidencePhotoUrl);
  const hasGeo =
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude);
  const hasMeta =
    hasPaymentText(collectionRef) ||
    hasPaymentText(noteText) ||
    hasPaymentText(evidenceUrl) ||
    hasGeo;

  if (!hasMeta) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.section}>Collection details</Text>
      {hasPaymentText(collectionRef) ? (
        <Text style={styles.line}>Payment reference: {collectionRef}</Text>
      ) : null}
      {hasPaymentText(noteText) ? <Text style={styles.muted}>Notes: {noteText}</Text> : null}
      {hasGeo ? (
        <Text style={styles.muted}>
          Location: {latitude!.toFixed(5)}, {longitude!.toFixed(5)}
        </Text>
      ) : null}
      {hasPaymentText(evidenceUrl) ? (
        <Pressable onPress={() => void Linking.openURL(evidenceUrl!)}>
          <Text style={styles.link}>View evidence photo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function PaymentDetailScreen({ route, navigation }: Props) {
  const { paymentId } = route.params;
  const drawerNav = useNavigation<NativeStackNavigationProp<AdminDrawerParamList>>();
  const { data: payment, isLoading, isError, error, refetch } = usePaymentDetail(paymentId);
  const { data: activityEvents } = useGetPaymentActivityTimelineQuery(paymentId);
  const { data: linkedInvoice } = useGetInvoiceForPaymentQuery(paymentId, {
    skip: !payment || payment.status !== 'confirmed',
  });
  const [pollVerification, { isLoading: resolving }] = usePollPaymentVerificationMutation();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const onResolvePending = useCallback(async () => {
    if (!payment?.gateway_order_id) {
      const msg = 'No gateway order ID on this payment.';
      setStatusMessage(msg);
      Alert.alert('Check status', msg);
      return;
    }
    setStatusMessage('Checking with payment gateway…');
    try {
      const result = await pollVerification({
        paymentId,
        orderId: payment.gateway_order_id,
        gateway: (payment.gateway_slug as 'razorpay' | undefined) ?? 'razorpay',
      }).unwrap();
      if (result.success || result.verified) {
        const msg = 'Payment verified and marked as confirmed.';
        setStatusMessage(msg);
        Alert.alert('Payment confirmed', msg);
        void refetch();
      } else {
        const msg = `No successful payment found on Razorpay yet (status: ${result.status ?? 'pending'}). The customer may not have completed checkout.`;
        setStatusMessage(msg);
        Alert.alert('Still pending', msg);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not verify payment';
      setStatusMessage(msg);
      Alert.alert('Check status', msg);
    }
  }, [payment, paymentId, pollVerification, refetch]);

  const onGenerateInvoice = useCallback(() => {
    if (!payment) return;
    drawerNav.navigate('Invoices', {
      screen: 'CreateInvoice',
      params: {
        invoiceType: 'gst',
        prefillFromPayment: {
          paymentId: payment.id,
          customerId: payment.customer_id,
          customerName: payment.customer_name,
          customerEmail: null,
          customerPhone: payment.customer_phone,
          amount: payment.total_amount,
          planName: payment.plan_name,
          notes: payment.cash_collection_notes,
        },
      },
    });
  }, [drawerNav, payment]);

  const onViewInvoice = useCallback(() => {
    if (!linkedInvoice) return;
    drawerNav.navigate('Invoices', {
      screen: 'InvoicePdfViewer',
      params: {
        storagePath: linkedInvoice.pdfStoragePath ?? '',
        title: `Invoice ${linkedInvoice.invoiceNumber}`,
        fileName: `${linkedInvoice.invoiceNumber}.pdf`,
      },
    });
  }, [drawerNav, linkedInvoice]);

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

  const isOfficerCollection = payment.channel === 'officer_cash';

  return (
    <AdminScreenLayout scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.number}>{payment.payment_number}</Text>
        <PaymentStatusBadge status={payment.status} />
      </View>
      <View style={styles.card}>
        <Text style={styles.section}>Customer</Text>
        <Text style={styles.line}>
          {formatPaymentCustomerLine({
            name: payment.customer_name,
            accountNumber: payment.account_number,
            phone: payment.customer_phone,
            customerId: payment.customer?.customer_id,
          })}
        </Text>
        {payment.customer_phone ? <Text style={styles.muted}>{payment.customer_phone}</Text> : null}
        {payment.plan_name ? <Text style={styles.muted}>Plan: {payment.plan_name}</Text> : null}
      </View>
      <View style={styles.card}>
        <Text style={styles.section}>Payment</Text>
        <AmountDisplay amount={payment.total_amount} large />
        <MethodIcon method={payment.method} />
        {payment.gateway_slug ? <Text style={styles.muted}>Gateway: {payment.gateway_slug}</Text> : null}
        {isOfficerCollection && payment.status === 'pending_review' ? (
          <Text style={styles.pendingHint}>Awaiting admin verification</Text>
        ) : null}
      </View>
      <CollectionMetadata
        gatewayPaymentId={payment.gateway_payment_id}
        receiptNumber={payment.receipt_number}
        notes={payment.cash_collection_notes}
        evidencePhotoUrl={payment.evidence_photo_url}
        latitude={payment.collection_latitude}
        longitude={payment.collection_longitude}
      />
      {payment.gateway_raw_response ? (
        <View style={styles.card}>
          <Text style={styles.section}>Gateway Response</Text>
          <Text style={styles.mono}>Order: {payment.gateway_order_id}</Text>
          <Text style={styles.mono}>Payment ID: {payment.gateway_payment_id}</Text>
        </View>
      ) : null}
      <View style={styles.card}>
        <Text style={styles.section}>Timeline</Text>
        <PaymentTimeline payment={payment} activityEvents={activityEvents} />
      </View>
      {(payment.status === 'pending_review' || payment.status === 'cash_collected') && (
        <AdminButton
          label="Review payment"
          onPress={() => navigation.navigate('PaymentReview', { paymentId })}
        />
      )}
      {(payment.status === 'initiated' || payment.status === 'pending_review') && payment.gateway_order_id ? (
        <AdminButton
          label={resolving ? 'Checking status…' : 'Check payment status'}
          variant="secondary"
          onPress={onResolvePending}
          disabled={resolving}
        />
      ) : null}
      {statusMessage ? <Text style={styles.feedback}>{statusMessage}</Text> : null}
      {payment.status === 'confirmed' && linkedInvoice ? (
        <AdminButton label="View invoice" variant="secondary" onPress={onViewInvoice} />
      ) : null}
      {payment.status === 'confirmed' ? (
        <AdminButton
          label={linkedInvoice ? 'Create another invoice' : 'Generate invoice'}
          variant="secondary"
          onPress={onGenerateInvoice}
        />
      ) : null}
      {payment.status === 'confirmed' && (
        <AdminButton
          label="Initiate refund"
          variant="ghost"
          onPress={() => navigation.navigate('Refund', { paymentId })}
        />
      )}
    </AdminScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  number: { fontFamily: 'monospace', fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  section: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: spacing.sm },
  line: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  muted: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  link: { fontSize: 13, fontWeight: '600', color: adminColors.primary, marginTop: spacing.xs },
  pendingHint: { fontSize: 12, color: colors.amber, marginTop: spacing.xs },
  mono: { fontFamily: 'monospace', fontSize: 12, color: colors.textPrimary, marginBottom: 4 },
  feedback: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
});
