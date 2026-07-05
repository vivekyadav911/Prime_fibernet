import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomerPaymentStatusPill } from '@/components/customer/payments/CustomerPaymentStatusPill';
import {
  GstInvoiceRequestSheet,
  type GstInvoiceFormValues,
  type GstInvoiceSubmittedState,
} from '@/components/customer/payments/GstInvoiceRequestSheet';
import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { CustomerButton, CustomerSkeletonLoader } from '@/components/customer/ui';
import { useCustomerIdentity } from '@/hooks/useCustomerIdentity';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import {
  useCreateGstInvoiceRequestMutation,
  useGetCustomerPaymentDetailQuery,
  useGetGstInvoiceRequestForPaymentQuery,
} from '@/services/api/paymentCollectionApi';
import type { CustomerTheme } from '@/theme/customer';
import { formatINR } from '@/utils/currencyFormat';
import { formatDateIst } from '@/utils/formatDate';
import { gstInvoiceStatusMessage } from '@/utils/gstInvoiceMessages';
import { queryErrorMessage } from '@/utils/queryError';
import {
  isFailedPayment,
  isPaidPayment,
  isPendingPayment,
  isStalePendingPayment,
} from '@/screens/customer/payments/utils/paymentHistoryFilters';

type CustomerPaymentDetailSheetProps = {
  paymentId: string | null;
  visible: boolean;
  onClose: () => void;
  onDownloadReceipt: (paymentId: string) => void;
  downloadingReceiptId?: string | null;
  onRetryPayment?: (paymentId: string) => void;
  retryLoading?: boolean;
};

function LineItem({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  const styles = useThemedStyles(createLineStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, emphasis && styles.valueEmphasis]}>{value}</Text>
    </View>
  );
}

function formatPaymentMethod(method: string, gatewaySlug?: string | null): string {
  const label = method.replace(/_/g, ' ').toUpperCase();
  if (gatewaySlug) return `${label} · ${gatewaySlug.toUpperCase()}`;
  return label;
}

export function CustomerPaymentDetailSheet({
  paymentId,
  visible,
  onClose,
  onDownloadReceipt,
  downloadingReceiptId = null,
  onRetryPayment,
  retryLoading = false,
}: CustomerPaymentDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();
  const { authUser } = useCustomerIdentity();
  const [gstSheetVisible, setGstSheetVisible] = useState(false);
  const [gstSubmitted, setGstSubmitted] = useState<GstInvoiceSubmittedState | null>(null);

  const { data: payment, isLoading, isError, error, refetch } = useGetCustomerPaymentDetailQuery(
    paymentId ?? '',
    { skip: !visible || !paymentId },
  );
  const { data: existingGstRequest } = useGetGstInvoiceRequestForPaymentQuery(paymentId ?? '', {
    skip: !visible || !paymentId,
  });
  const [createGstRequest, { isLoading: gstSubmitting }] = useCreateGstInvoiceRequestMutation();

  const failed = payment ? isFailedPayment(payment.status) : false;
  const paid = payment ? isPaidPayment(payment.status) : false;
  const pending = payment ? isPendingPayment(payment.status) : false;
  const stalePending = payment ? isStalePendingPayment(payment.created_at) : false;

  const openGstSheet = useCallback(() => {
    if (existingGstRequest) {
      Alert.alert('Request Already Submitted', gstInvoiceStatusMessage(existingGstRequest.status), [
        { text: 'OK' },
      ]);
      return;
    }
    setGstSubmitted(null);
    setGstSheetVisible(true);
  }, [existingGstRequest]);

  const onGstSubmit = useCallback(
    async (values: GstInvoiceFormValues) => {
      if (!paymentId) return;
      try {
        const result = await createGstRequest({
          paymentId,
          gstin: values.gstin,
          businessName: values.businessName,
          billingAddress: values.billingAddress,
        }).unwrap();

        if (result.alreadyExists) {
          Alert.alert(
            'Request Already Submitted',
            gstInvoiceStatusMessage(result.status ?? 'pending'),
            [{ text: 'OK' }],
          );
          setGstSheetVisible(false);
          return;
        }

        setGstSubmitted({
          requestId: result.id,
          gstin: values.gstin.toUpperCase(),
          businessName: values.businessName,
          customerEmail: authUser?.email,
        });
      } catch {
        Alert.alert('Submission Failed', 'Could not submit request. Please try again.');
      }
    },
    [authUser?.email, createGstRequest, paymentId],
  );

  const closeGstSheet = useCallback(() => {
    setGstSheetVisible(false);
    setGstSubmitted(null);
  }, []);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close payment details" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Invoice details</Text>
          <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <CustomerSkeletonLoader rows={4} rowHeight={48} />
        ) : isError || !payment ? (
          <View style={styles.errorBlock}>
            <Text style={styles.error}>
              {queryErrorMessage(error, 'Could not load payment details.')}
            </Text>
            <CustomerButton label="Retry" variant="outline" onPress={() => void refetch()} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.topRow}>
              <Text style={styles.invoiceNo}>Invoice #{payment.payment_number}</Text>
              <CustomerPaymentStatusPill status={payment.status} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Line items</Text>
              <LineItem label="Plan / service" value={payment.plan_name ?? 'Broadband'} />
              <LineItem label="Subtotal" value={formatINR(payment.amount)} />
              {payment.tax_amount > 0 ? (
                <LineItem label="Tax (GST)" value={formatINR(payment.tax_amount)} />
              ) : null}
              {payment.discount_amount > 0 ? (
                <LineItem label="Discount" value={`−${formatINR(payment.discount_amount)}`} />
              ) : null}
              <LineItem label="Total" value={formatINR(payment.total_amount)} emphasis />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Billing</Text>
              {payment.billing_period_start ? (
                <LineItem
                  label="Period"
                  value={new Date(payment.billing_period_start).toLocaleDateString('en-IN', {
                    month: 'long',
                    year: 'numeric',
                  })}
                />
              ) : null}
              {payment.due_date ? <LineItem label="Due date" value={formatDateIst(payment.due_date)} /> : null}
              <LineItem
                label="Method"
                value={formatPaymentMethod(payment.method, payment.gateway_slug)}
              />
              <LineItem
                label="Date"
                value={formatDateIst(payment.confirmed_at ?? payment.paid_at ?? payment.created_at)}
              />
              {payment.gateway_payment_id ? (
                <LineItem label="Transaction ID" value={payment.gateway_payment_id} />
              ) : null}
            </View>

            {pending ? (
              <View style={styles.pendingNote}>
                <Text style={styles.pendingNoteText}>
                  This payment is being processed. If you completed the payment, it will update automatically within a few minutes.
                </Text>
              </View>
            ) : null}

            {failed && payment.failure_reason ? (
              <View style={styles.failureBox}>
                <Text style={styles.failureTitle}>Payment failed</Text>
                <Text style={styles.failureBody}>{payment.failure_reason}</Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              {paid ? (
                <>
                  <CustomerButton
                    label={downloadingReceiptId === payment.id ? 'Preparing receipt…' : 'Download receipt'}
                    icon="download-outline"
                    onPress={() => onDownloadReceipt(payment.id)}
                    disabled={downloadingReceiptId === payment.id}
                  />
                  <CustomerButton
                    label={existingGstRequest ? 'GST invoice requested' : 'Request GST invoice'}
                    icon="file-document-outline"
                    variant="outline"
                    onPress={openGstSheet}
                    disabled={Boolean(existingGstRequest)}
                  />
                </>
              ) : null}
              {(failed || (pending && stalePending)) && onRetryPayment ? (
                <CustomerButton
                  label={retryLoading ? 'Starting checkout…' : pending && stalePending ? 'Pay again' : 'Retry payment'}
                  icon="refresh"
                  onPress={() => onRetryPayment(payment.id)}
                  disabled={retryLoading}
                />
              ) : null}
            </View>
          </ScrollView>
        )}
      </View>

      <GstInvoiceRequestSheet
        visible={gstSheetVisible}
        loading={gstSubmitting}
        submitted={gstSubmitted}
        onSubmit={(values) => void onGstSubmit(values)}
        onClose={closeGstSheet}
      />
    </Modal>
  );
}

const createLineStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    label: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      flex: 1,
    },
    value: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.mono,
      flexShrink: 1,
      textAlign: 'right',
    },
    valueEmphasis: {
      color: theme.colors.primary,
      fontWeight: '700',
      fontFamily: theme.fonts.monoBold,
    },
  });

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
    },
    sheet: {
      maxHeight: '82%',
      backgroundColor: theme.colors.bgSurface,
      borderTopLeftRadius: theme.radius.lg,
      borderTopRightRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.borderSubtle,
      marginBottom: theme.spacing.sm,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSubtle,
    },
    title: {
      ...theme.typography.bodyLg,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
      fontWeight: '700',
    },
    close: {
      color: theme.colors.primary,
      fontFamily: theme.fonts.bodyMedium,
      fontSize: 14,
    },
    content: {
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.md,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    invoiceNo: {
      ...theme.typography.monoMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.monoBold,
      flex: 1,
    },
    section: {
      gap: theme.spacing.xs,
    },
    sectionTitle: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.bodyMedium,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: theme.spacing.xs,
    },
    pendingNote: {
      backgroundColor: theme.colors.accentPrimaryMuted,
      borderRadius: theme.radius.sm,
      padding: theme.spacing.md,
    },
    pendingNoteText: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    failureBox: {
      backgroundColor: theme.colors.errorContainer,
      borderRadius: theme.radius.sm,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    failureTitle: {
      color: theme.colors.error,
      fontFamily: theme.fonts.bodySemiBold,
      fontWeight: '700',
    },
    failureBody: {
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    actions: {
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
    },
    errorBlock: {
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.lg,
    },
    error: {
      color: theme.colors.error,
      fontFamily: theme.fonts.body,
    },
  });
