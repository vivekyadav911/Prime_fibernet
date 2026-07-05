import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRazorpay } from '@codearcade/expo-razorpay';
import * as WebBrowser from 'expo-web-browser';

import { EasebuzzCheckout } from '@/components/customer/payments/EasebuzzCheckout';
import { CustomerPaymentDetailSheet } from '@/components/customer/payments/CustomerPaymentDetailSheet';
import { CustomerPaymentStatusPill } from '@/components/customer/payments/CustomerPaymentStatusPill';
import { GstInvoiceRequestSheet, type GstInvoiceFormValues } from '@/components/customer/payments/GstInvoiceRequestSheet';
import { PaymentSuccessSheet } from '@/components/customer/payments/PaymentSuccessSheet';
import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import {
  CustomerButton,
  CustomerEmptyState,
  CustomerErrorState,
  CustomerSkeletonLoader,
  GlassCard,
  PressableScale,
} from '@/components/customer/ui';
import { CustomerTopBar } from '@/components/customer/shell';
import { DismissKeyboardScrollView } from '@/components/common';
import { useCustomerIdentity } from '@/hooks/useCustomerIdentity';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useVerifyPaymentMutation } from '@/services/api';
import {
  useCreateGstInvoiceRequestMutation,
  useCreatePaymentOrderV2Mutation,
  useGetActivePaymentGatewayQuery,
  useGetCustomerBillQuery,
  useGetCustomerPaymentHistoryV2Query,
  useLazyGetPaymentReceiptQuery,
} from '@/services/api/paymentCollectionApi';
import type { PaymentCheckoutSession } from '@/services/payment/PaymentProvider';
import { getPaymentProvider, resolvePaymentProviderSlug } from '@/services/payment/PaymentProvider';
import { useAppDispatch } from '@/store/hooks';
import type { CustomerStackParamList } from '@/types/navigation';
import type { CustomerTheme } from '@/theme/customer';
import { formatINR } from '@/utils/currencyFormat';
import { invalidatePaymentCaches } from '@/utils/invalidatePaymentCaches';
import { queryErrorMessage } from '@/utils/queryError';

import { resolvePaymentChargeAmount } from '@/services/customer/customerOutstanding';

import {
  isFailedPayment,
  paymentPeriodLabel,
} from './utils/paymentHistoryFilters';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isGatewayNotConfigured(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('no active payment gateway') || lower.includes('gateway not configured');
}

function isRazorpayGateway(slug: string | undefined | null): boolean {
  return resolvePaymentProviderSlug(slug) === 'razorpay';
}

export function CustomerBillScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  const dispatch = useAppDispatch();
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();
  const { authUser: user, userId } = useCustomerIdentity();
  const authId = userId;

  const { openCheckout, RazorpayUI } = useRazorpay();

  const [checkoutSession, setCheckoutSession] = useState<PaymentCheckoutSession | null>(null);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [payMode, setPayMode] = useState<'bill' | 'advance' | 'retry'>('bill');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [rzpLoading, setRzpLoading] = useState(false);
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);
  const [successPaymentId, setSuccessPaymentId] = useState('');
  const [successPortalPaymentId, setSuccessPortalPaymentId] = useState('');
  const [successAmount, setSuccessAmount] = useState(0);
  const [successInvoiceNumber, setSuccessInvoiceNumber] = useState<string | undefined>();
  const [gstSheetVisible, setGstSheetVisible] = useState(false);
  const [gstPaymentId, setGstPaymentId] = useState<string | null>(null);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);

  const { data: bill, isLoading, isError, error, refetch } = useGetCustomerBillQuery(authId, {
    skip: !authId,
  });
  const { data: history = [], isLoading: historyLoading, refetch: refetchHistory } = useGetCustomerPaymentHistoryV2Query(
    authId,
    { skip: !authId },
  );
  const { data: activeGateway } = useGetActivePaymentGatewayQuery();
  const [createOrder, { isLoading: orderLoading }] = useCreatePaymentOrderV2Mutation();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [fetchReceipt] = useLazyGetPaymentReceiptQuery();
  const [createGstRequest, { isLoading: gstSubmitting }] = useCreateGstInvoiceRequestMutation();

  const provider = getPaymentProvider(resolvePaymentProviderSlug(activeGateway?.slug));
  const payButtonLabel =
    activeGateway?.slug === 'easebuzz' ? 'Pay Now via Easebuzz' : `Pay Now via ${provider.displayName}`;

  const handlePaymentSuccess = useCallback(
    async (data: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
      paymentId: string;
      amount: number;
    }) => {
      setRzpLoading(false);
      try {
        const result = await verifyPayment({
          paymentId: data.paymentId,
          orderId: data.razorpay_order_id,
          gateway: 'razorpay',
          razorpayPaymentId: data.razorpay_payment_id,
          razorpaySignature: data.razorpay_signature,
        }).unwrap();

        invalidatePaymentCaches(dispatch);
        void refetch();
        void refetchHistory();

        if (result.success || result.verified) {
          const paidRow = history.find((row) => row.id === data.paymentId);
          setSuccessPaymentId(data.razorpay_payment_id);
          setSuccessPortalPaymentId(data.paymentId);
          setSuccessAmount(data.amount);
          setSuccessInvoiceNumber(paidRow?.payment_number);
          setShowSuccessSheet(true);
        } else {
          Alert.alert(
            'Verification Pending',
            'Your payment was received but is being verified. This usually takes under a minute. Check Payment History for the final status.',
            [{ text: 'OK' }],
          );
        }
      } catch {
        Alert.alert(
          'Verification Failed',
          'Payment was received but could not be verified immediately. Please check Payment History — your balance will update within 5 minutes.',
          [{ text: 'OK' }],
        );
        invalidatePaymentCaches(dispatch);
      }
    },
    [dispatch, history, refetch, refetchHistory, verifyPayment],
  );

  const openRazorpayCheckout = useCallback(
    (session: PaymentCheckoutSession, amount: number, customerName: string, customerEmail: string, customerPhone: string) => {
      setRzpLoading(true);
      openCheckout(
        {
          key: session.keyId,
          amount: Math.round(amount * 100),
          currency: 'INR',
          order_id: session.orderId,
          name: 'Prime Fibernet',
          description: `Bill Payment - ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`,
          image: 'https://www.primefiber.net/logo.png',
          prefill: {
            name: customerName,
            email: customerEmail ?? '',
            contact: customerPhone ?? '',
          },
          theme: { color: '#3D52D5' },
          modal: {
            confirm_close: true,
            animation: true,
          },
        },
        {
          onSuccess: (rzpData) => {
            void handlePaymentSuccess({
              razorpay_payment_id: rzpData.razorpay_payment_id,
              razorpay_order_id: rzpData.razorpay_order_id,
              razorpay_signature: rzpData.razorpay_signature,
              paymentId: session.paymentId,
              amount,
            });
          },
          onFailure: (rzpError) => {
            setRzpLoading(false);
            Alert.alert(
              'Payment Failed',
              rzpError.description ?? 'Payment could not be completed. No amount was charged.',
            );
          },
          onClose: () => {
            setRzpLoading(false);
          },
        },
      );
    },
    [handlePaymentSuccess, openCheckout],
  );

  const startCheckoutWithSession = useCallback(
    (session: PaymentCheckoutSession, amount: number) => {
      if (!user) return;

      if (isRazorpayGateway(session.gatewaySlug)) {
        openRazorpayCheckout(session, amount, user.name, user.email, '');
        return;
      }

      setCheckoutSession(session);
      setCheckoutVisible(true);
    },
    [openRazorpayCheckout, user],
  );

  const initiateCheckout = useCallback(
    async (mode: 'bill' | 'advance' = 'bill') => {
      if (!bill || !user) return;
      setPayMode(mode);

      const amount = mode === 'advance' ? bill.planAmount : bill.totalPayable;
      if (amount <= 0) return;

      try {
        const session = await createOrder({
          customerId: bill.customerId,
          userName: user.name,
          userEmail: user.email,
          userPhone: '',
          amount,
          planName: bill.planName ?? 'Broadband',
          billingPeriodStart: bill.billingPeriodStart ?? undefined,
          billingPeriodEnd: bill.billingPeriodEnd ?? undefined,
          dueDate: bill.dueDate ?? undefined,
        }).unwrap();

        startCheckoutWithSession(
          {
            paymentId: session.paymentId,
            orderId: session.orderId,
            gatewaySlug: resolvePaymentProviderSlug(session.gatewaySlug),
            keyId: session.keyId,
            amount: session.amount,
            checkoutUrl: session.checkoutUrl,
            checkoutParams: session.checkoutParams,
          },
          amount,
        );
      } catch (e) {
        setRzpLoading(false);
        const message = queryErrorMessage(e);
        if (isGatewayNotConfigured(message)) {
          Alert.alert(
            'Online payments unavailable',
            'Your ISP is finishing payment gateway setup. You can pay cash to your field officer or visit our office.',
          );
        } else {
          Alert.alert('Could not start checkout', 'Could not connect to payment gateway. Please try again.');
        }
      }
    },
    [bill, createOrder, startCheckoutWithSession, user],
  );

  const onRetryPayment = useCallback(
    async (paymentId: string) => {
      const payment = history.find((row) => row.id === paymentId);
      if (!payment || !user) return;
      setPayMode('retry');

      try {
        const session = await createOrder({
          customerId: payment.customer_id,
          userName: user.name,
          userEmail: user.email,
          userPhone: payment.customer_phone ?? '',
          amount: resolvePaymentChargeAmount(payment.total_amount, bill?.planAmount ?? 0),
          planName: payment.plan_name ?? bill?.planName ?? 'Broadband',
          billingPeriodStart: payment.billing_period_start ?? undefined,
          billingPeriodEnd: payment.billing_period_end ?? undefined,
          dueDate: payment.due_date ?? undefined,
        }).unwrap();

        setSelectedPaymentId(null);
        startCheckoutWithSession(
          {
            paymentId: session.paymentId,
            orderId: session.orderId,
            gatewaySlug: resolvePaymentProviderSlug(session.gatewaySlug),
            keyId: session.keyId,
            amount: session.amount,
            checkoutUrl: session.checkoutUrl,
            checkoutParams: session.checkoutParams,
          },
          resolvePaymentChargeAmount(payment.total_amount, bill?.planAmount ?? 0),
        );
      } catch (e) {
        setRzpLoading(false);
        const message = queryErrorMessage(e);
        if (isGatewayNotConfigured(message)) {
          Alert.alert(
            'Online payments unavailable',
            'Your ISP is finishing payment gateway setup. You can pay cash to your field officer or visit our office.',
          );
        } else {
          Alert.alert('Could not start checkout', 'Could not connect to payment gateway. Please try again.');
        }
      }
    },
    [bill?.planAmount, bill?.planName, createOrder, history, startCheckoutWithSession, user],
  );

  const onCheckoutComplete = useCallback(
    (result: {
      success: boolean;
      paymentId: string;
      orderId?: string;
      reason?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
    }) => {
      setCheckoutVisible(false);
      setCheckoutSession(null);

      if (!bill) return;

      if (result.success) {
        navigation.navigate('PaymentResult', {
          paymentId: result.paymentId,
          orderId: result.orderId,
          amount: bill.totalPayable,
          planName: bill.planName ?? 'Broadband',
          gatewaySlug: activeGateway?.slug,
          razorpayPaymentId: result.razorpayPaymentId,
          razorpaySignature: result.razorpaySignature,
        });
        invalidatePaymentCaches(dispatch);
        void refetch();
        void refetchHistory();
        return;
      }

      if (result.reason && result.reason !== 'dismissed') {
        Alert.alert('Payment incomplete', result.reason);
      }
    },
    [activeGateway?.slug, bill, dispatch, navigation, refetch, refetchHistory],
  );

  const onReceipt = useCallback(
    async (paymentId: string) => {
      setDownloadingReceiptId(paymentId);
      try {
        const result = await fetchReceipt(paymentId).unwrap();
        if (result.url) {
          const canOpen = await Linking.canOpenURL(result.url);
          if (canOpen) {
            await Linking.openURL(result.url);
          } else {
            await WebBrowser.openBrowserAsync(result.url);
          }
        } else {
          navigation.navigate('Receipt', { paymentId });
        }
      } catch {
        Alert.alert(
          'Download Failed',
          'Could not generate your receipt. Please try again or contact support.',
          [{ text: 'OK' }],
        );
      } finally {
        setDownloadingReceiptId(null);
      }
    },
    [fetchReceipt, navigation],
  );

  const onGstSubmit = useCallback(
    async (values: GstInvoiceFormValues) => {
      const paymentId = gstPaymentId ?? successPortalPaymentId;
      if (!paymentId) return;
      try {
        await createGstRequest({
          paymentId,
          gstin: values.gstin,
          businessName: values.businessName,
          billingAddress: values.billingAddress,
        }).unwrap();
        setGstSheetVisible(false);
        setGstPaymentId(null);
      } catch (e) {
        Alert.alert('Could not submit request', queryErrorMessage(e, 'Please try again.'));
      }
    },
    [createGstRequest, gstPaymentId, successPortalPaymentId],
  );

  const renderBody = () => {
    if (!authId) {
      return <CustomerErrorState message="Sign in to view payments." />;
    }

    if (isLoading || historyLoading) {
      return (
        <View style={styles.body}>
          <CustomerSkeletonLoader rows={6} rowHeight={72} />
        </View>
      );
    }

    if (isError || !bill) {
      return <CustomerErrorState message={queryErrorMessage(error)} onRetry={refetch} />;
    }

    const hasOutstanding = bill.outstandingAmount > 0;
    const payLoadingLabel = 'Starting checkout…';

    return (
      <DismissKeyboardScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.balanceCard} glow padded contentStyle={styles.balanceContent}>
          <Text style={styles.balanceTitle}>Outstanding Balance</Text>
          {bill.dueDate && hasOutstanding ? (
            <Text style={styles.balanceDue}>Due by {formatDate(bill.dueDate)}</Text>
          ) : null}
          <Text style={styles.balanceAmount}>{formatINR(hasOutstanding ? bill.totalPayable : 0)}</Text>
          {hasOutstanding && bill.lateFee > 0 ? (
            <Text style={styles.balanceBreakdown}>Includes {formatINR(bill.lateFee)} late fee</Text>
          ) : null}
          {hasOutstanding && activeGateway ? (
            <CustomerButton
              label={orderLoading && payMode === 'bill' ? payLoadingLabel : payButtonLabel}
              icon="credit-card-outline"
              onPress={() => void initiateCheckout('bill')}
              disabled={orderLoading || rzpLoading}
            />
          ) : null}
          {!hasOutstanding ? (
            <Text style={styles.paidUp}>You are all caught up for this billing cycle.</Text>
          ) : null}
        </GlassCard>

        {bill.dueDate ? (
          <GlassCard style={styles.dueCard} padded>
            <View style={styles.dueHeader}>
              <MaterialCommunityIcons name="calendar-clock" size={22} color={theme.colors.primary} />
              <Text style={styles.dueTitle}>Next Due Date</Text>
            </View>
            <Text style={styles.dueDate}>{formatDate(bill.dueDate)}</Text>
            {bill.planName ? <Text style={styles.duePlan}>{bill.planName} · {formatINR(bill.planAmount)}/cycle</Text> : null}
            {activeGateway ? (
              <CustomerButton
                label={orderLoading && payMode === 'advance' ? payLoadingLabel : 'Pay in Advance'}
                variant="outline"
                icon="wallet-outline"
                onPress={() => void initiateCheckout('advance')}
                disabled={orderLoading || rzpLoading}
              />
            ) : null}
          </GlassCard>
        ) : null}

        <GlassCard style={styles.historyCard} padded>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Payment History</Text>
            <PressableScale onPress={() => navigation.navigate('PaymentHistory')}>
              <View style={styles.filterBtn}>
                <MaterialCommunityIcons name="history" size={18} color={theme.colors.primary} />
                <Text style={styles.filterText}>View all</Text>
              </View>
            </PressableScale>
          </View>

          {!history.length ? (
            <CustomerEmptyState
              title="No payments yet"
              subtitle="Your payment history will appear here after you pay a bill"
              icon="💳"
            />
          ) : (
            history.slice(0, 8).map((item) => (
              <PressableScale
                key={item.id}
                style={styles.historyItem}
                onPress={() => setSelectedPaymentId(item.id)}
              >
                <View style={styles.historyLeft}>
                  <View style={[styles.historyIcon, isFailedPayment(item.status) && styles.historyIconError]}>
                    <MaterialCommunityIcons
                      name={isFailedPayment(item.status) ? 'alert' : 'file-document-outline'}
                      size={20}
                      color={isFailedPayment(item.status) ? theme.colors.error : theme.colors.primary}
                    />
                  </View>
                  <View>
                    <Text style={styles.historyMonth}>{paymentPeriodLabel(item)}</Text>
                    <Text style={styles.historyInv}>Inv #{item.payment_number}</Text>
                  </View>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyAmount}>{formatINR(item.total_amount)}</Text>
                  <CustomerPaymentStatusPill status={item.status} />
                </View>
              </PressableScale>
            ))
          )}
        </GlassCard>

        {activeGateway ? (
          <Text style={styles.gatewayHint}>Secured by {activeGateway.display_name ?? provider.displayName}</Text>
        ) : (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Cash & office payments</Text>
            <Text style={styles.noticeBody}>
              Online checkout is not active yet. Pay cash to your field officer or visit our office.
            </Text>
          </View>
        )}
      </DismissKeyboardScrollView>
    );
  };

  return (
    <View style={styles.canvas}>
      <CustomerTopBar onNotificationsPress={() => navigation.navigate('Notifications')} />
      {renderBody()}

      <CustomerPaymentDetailSheet
        paymentId={selectedPaymentId}
        visible={Boolean(selectedPaymentId)}
        onClose={() => setSelectedPaymentId(null)}
        onDownloadReceipt={(id) => void onReceipt(id)}
        downloadingReceiptId={downloadingReceiptId}
        onRetryPayment={(id) => void onRetryPayment(id)}
        retryLoading={orderLoading && payMode === 'retry'}
      />

      <EasebuzzCheckout
        visible={checkoutVisible}
        session={checkoutSession}
        customer={{
          name: user?.name ?? '',
          email: user?.email ?? '',
          phone: '',
        }}
        onClose={() => {
          setCheckoutVisible(false);
          setCheckoutSession(null);
        }}
        onComplete={onCheckoutComplete}
      />

      <PaymentSuccessSheet
        visible={showSuccessSheet}
        paymentId={successPaymentId}
        amount={successAmount}
        invoiceNumber={successInvoiceNumber}
        onClose={() => setShowSuccessSheet(false)}
        onDownloadReceipt={() => {
          void onReceipt(successPortalPaymentId);
        }}
        onRequestGST={() => {
          setGstPaymentId(successPortalPaymentId);
          setGstSheetVisible(true);
        }}
        onViewHistory={() => {
          setShowSuccessSheet(false);
          navigation.navigate('PaymentHistory');
        }}
      />

      <GstInvoiceRequestSheet
        visible={gstSheetVisible}
        loading={gstSubmitting}
        onSubmit={(values) => void onGstSubmit(values)}
        onClose={() => {
          setGstSheetVisible(false);
          setGstPaymentId(null);
        }}
      />

      {RazorpayUI}

      <Modal visible={rzpLoading} transparent animationType="fade">
        <View style={styles.rzpOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.rzpLoadingText}>Opening secure checkout…</Text>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    canvas: { flex: 1, backgroundColor: theme.colors.bgDeep },
    body: { flex: 1, padding: theme.spacing.marginMobile },
    scroll: {
      paddingHorizontal: theme.spacing.marginMobile,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xxxl,
      gap: theme.spacing.md,
    },
    balanceCard: {
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
    },
    balanceContent: {
      gap: theme.spacing.sm,
    },
    balanceTitle: {
      ...theme.typography.displayMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
    },
    balanceDue: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
    },
    balanceAmount: {
      fontSize: 48,
      fontWeight: '700',
      color: theme.colors.primary,
      fontFamily: theme.fonts.monoBold,
      marginVertical: theme.spacing.sm,
    },
    balanceBreakdown: {
      ...theme.typography.caption,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
    },
    paidUp: {
      ...theme.typography.body,
      color: theme.colors.secondary,
      fontFamily: theme.fonts.bodyMedium,
    },
    dueCard: {
      borderRadius: theme.radius.lg,
      gap: theme.spacing.sm,
    },
    dueHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    dueTitle: {
      ...theme.typography.displayMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
    },
    dueDate: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.monoBold,
    },
    duePlan: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
    },
    historyCard: { borderRadius: theme.radius.lg },
    historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSubtle,
    },
    historyTitle: {
      ...theme.typography.displayMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
    },
    filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    filterText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      fontFamily: theme.fonts.bodyMedium,
    },
    historyItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.sm,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      marginBottom: theme.spacing.sm,
    },
    historyLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flex: 1 },
    historyIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.accentPrimaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    historyIconError: { backgroundColor: theme.colors.errorContainer },
    historyMonth: {
      ...theme.typography.bodyLg,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.body,
      fontSize: 16,
    },
    historyInv: {
      ...theme.typography.caption,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.bodyMedium,
    },
    historyRight: { alignItems: 'flex-end', gap: theme.spacing.xs },
    historyAmount: {
      ...theme.typography.monoMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.mono,
    },
    notice: {
      backgroundColor: theme.colors.accentPrimaryMuted,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
    },
    noticeTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.accentWarning,
      marginBottom: theme.spacing.xs,
    },
    noticeBody: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },
    gatewayHint: {
      textAlign: 'center',
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    rzpOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.md,
    },
    rzpLoadingText: {
      ...theme.typography.body,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodyMedium,
    },
  });
