import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { CustomerPaymentDetailSheet } from '@/components/customer/payments/CustomerPaymentDetailSheet';
import { CustomerPaymentStatusPill } from '@/components/customer/payments/CustomerPaymentStatusPill';
import { EasebuzzCheckout } from '@/components/customer/payments/EasebuzzCheckout';
import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import {
  CustomerEmptyState,
  CustomerErrorState,
  CustomerFilterChips,
  CustomerSkeletonLoader,
  GlassCard,
  PressableScale,
} from '@/components/customer/ui';
import { DateRangePicker } from '@/components/common/pickers/DateRangePicker';
import { DismissKeyboardFlatList } from '@/components/common';
import { useCustomerIdentity } from '@/hooks/useCustomerIdentity';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { resolvePaymentChargeAmount } from '@/services/customer/customerOutstanding';
import {
  useCreatePaymentOrderV2Mutation,
  useGetActivePaymentGatewayQuery,
  useGetCustomerBillQuery,
  useGetCustomerPaymentHistoryV2Query,
  useLazyGetPaymentReceiptQuery,
} from '@/services/api/paymentCollectionApi';
import { usePollPaymentVerificationMutation } from '@/services/api';
import type { PaymentCheckoutSession } from '@/services/payment/PaymentProvider';
import { getPaymentProvider, resolvePaymentProviderSlug } from '@/services/payment/PaymentProvider';
import { useRazorpayCheckout } from '@/services/payments/razorpayCheckout';
import { useAppDispatch } from '@/store/hooks';
import type { PaymentRecord, PaymentStatus } from '@/types/payments';
import type { CustomerStackParamList } from '@/types/navigation';
import type { CustomerTheme } from '@/theme/customer';
import { formatINR } from '@/utils/currencyFormat';
import { downloadPaymentReceipt } from '@/utils/downloadPaymentReceipt';
import { invalidatePaymentCaches } from '@/utils/invalidatePaymentCaches';
import { queryErrorMessage } from '@/utils/queryError';

import {
  PAYMENT_STATUS_FILTERS,
  filterPaymentHistory,
  paymentPeriodLabel,
  type PaymentStatusFilter,
} from './utils/paymentHistoryFilters';

function isRazorpayGateway(slug: string | undefined | null): boolean {
  return resolvePaymentProviderSlug(slug) === 'razorpay';
}

export function PaymentHistoryScreenV2() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  const dispatch = useAppDispatch();
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();
  const { authUser: user, userId } = useCustomerIdentity();

  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [checkoutSession, setCheckoutSession] = useState<PaymentCheckoutSession | null>(null);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);
  const [retryAmount, setRetryAmount] = useState(0);

  const { openCheckout, RazorpayUI } = useRazorpayCheckout();

  const { data, isLoading, isError, error, refetch } = useGetCustomerPaymentHistoryV2Query(userId, {
    skip: !userId,
  });
  const { data: bill } = useGetCustomerBillQuery(userId, { skip: !userId });
  const { data: activeGateway } = useGetActivePaymentGatewayQuery();
  const [fetchReceipt] = useLazyGetPaymentReceiptQuery();
  const [createOrder, { isLoading: orderLoading }] = useCreatePaymentOrderV2Mutation();
  const [pollVerification] = usePollPaymentVerificationMutation();
  const pollStartedAtRef = useRef<number | null>(null);

  const pendingPayments = useMemo(
    () =>
      (data ?? []).filter(
        (row) =>
          (row.status === 'initiated' || row.status === 'pending_review') &&
          Boolean(row.gateway_order_id),
      ),
    [data],
  );

  useFocusEffect(
    useCallback(() => {
      if (pendingPayments.length === 0) return undefined;

      pollStartedAtRef.current = Date.now();
      const gatewaySlug = activeGateway?.slug ?? 'razorpay';

      const tick = () => {
        if (!pollStartedAtRef.current) return;
        if (Date.now() - pollStartedAtRef.current > 5 * 60 * 1000) return;

        for (const payment of pendingPayments) {
          void pollVerification({
            paymentId: payment.id,
            orderId: payment.gateway_order_id ?? undefined,
            gateway:
              gatewaySlug === 'easebuzz'
                ? 'easybuzz'
                : gatewaySlug === 'razorpay'
                  ? 'razorpay'
                  : undefined,
          })
            .unwrap()
            .then((result) => {
              if (result.success || result.verified) {
                invalidatePaymentCaches(dispatch);
                void refetch();
              }
            })
            .catch(() => undefined);
        }
      };

      tick();
      const intervalId = setInterval(tick, 15_000);
      return () => clearInterval(intervalId);
    }, [activeGateway?.slug, dispatch, pendingPayments, pollVerification, refetch]),
  );

  const filtered = useMemo(
    () =>
      filterPaymentHistory(
        data ?? [],
        statusFilter,
        dateFrom || null,
        dateTo || null,
      ),
    [data, dateFrom, dateTo, statusFilter],
  );

  const onReceipt = useCallback(
    async (paymentId: string, status?: PaymentStatus) => {
      setDownloadingReceiptId(paymentId);
      try {
        const resolvedStatus = status ?? (data ?? []).find((row) => row.id === paymentId)?.status;
        await downloadPaymentReceipt(
          paymentId,
          (id) => fetchReceipt(id).unwrap(),
          {
            status: resolvedStatus,
            onFallback: (id) => navigation.navigate('Receipt', { paymentId: id }),
          },
        );
      } finally {
        setDownloadingReceiptId(null);
      }
    },
    [data, fetchReceipt, navigation],
  );

  const onRetryPayment = useCallback(
    async (paymentId: string) => {
      const payment = (data ?? []).find((row) => row.id === paymentId);
      if (!payment || !user) return;

      const amount = resolvePaymentChargeAmount(payment.total_amount, bill?.planAmount ?? 0);

      try {
        const session = await createOrder({
          customerId: payment.customer_id,
          userName: user.name,
          userEmail: user.email,
          userPhone: payment.customer_phone ?? '',
          amount,
          intent: 'retry',
          planName: payment.plan_name ?? 'Broadband',
          billingPeriodStart: payment.billing_period_start ?? undefined,
          billingPeriodEnd: payment.billing_period_end ?? undefined,
          dueDate: payment.due_date ?? undefined,
        }).unwrap();

        setSelectedPaymentId(null);
        setRetryAmount(amount);

        const checkoutSession: PaymentCheckoutSession = {
          paymentId: session.paymentId,
          orderId: session.orderId,
          gatewaySlug: resolvePaymentProviderSlug(session.gatewaySlug),
          keyId: session.keyId,
          amount: session.amount,
          checkoutUrl: session.checkoutUrl,
          checkoutParams: session.checkoutParams,
        };

        if (isRazorpayGateway(checkoutSession.gatewaySlug)) {
          openCheckout(
            {
              key: checkoutSession.keyId,
              amount: Math.round(amount * 100),
              currency: 'INR',
              order_id: checkoutSession.orderId,
              name: 'Prime Fibernet',
              description: `Bill Payment - ${paymentPeriodLabel(payment)}`,
              image: 'https://www.primefiber.net/logo.png',
              prefill: {
                name: user.name,
                email: user.email ?? '',
                contact: payment.customer_phone ?? '',
              },
              theme: { color: '#3D52D5' },
              modal: {
                confirm_close: true,
                animation: true,
              },
            },
            {
              onSuccess: (rzpData) => {
                invalidatePaymentCaches(dispatch);
                navigation.navigate('PaymentResult', {
                  paymentId: checkoutSession.paymentId,
                  orderId: rzpData.razorpay_order_id,
                  amount,
                  planName: payment.plan_name ?? 'Broadband',
                  gatewaySlug: activeGateway?.slug,
                  razorpayPaymentId: rzpData.razorpay_payment_id,
                  razorpaySignature: rzpData.razorpay_signature,
                });
                void refetch();
              },
              onFailure: (rzpError) => {
                Alert.alert(
                  'Payment Failed',
                  rzpError.description ?? 'Payment could not be completed. No amount was charged.',
                );
              },
              onClose: () => {},
            },
          );
          return;
        }

        setCheckoutSession(checkoutSession);
        setCheckoutVisible(true);
      } catch (e) {
        Alert.alert('Could not start checkout', queryErrorMessage(e));
      }
    },
    [activeGateway?.slug, bill?.planAmount, createOrder, data, navigation, openCheckout, refetch, user],
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

      if (result.success) {
        const payment = (data ?? []).find((row) => row.id === result.paymentId);
        navigation.navigate('PaymentResult', {
          paymentId: result.paymentId,
          orderId: result.orderId,
          amount: payment?.total_amount ?? retryAmount ?? checkoutSession?.amount ?? 0,
          planName: payment?.plan_name ?? 'Broadband',
          gatewaySlug: activeGateway?.slug,
          razorpayPaymentId: result.razorpayPaymentId,
          razorpaySignature: result.razorpaySignature,
        });
        void refetch();
        return;
      }

      if (result.reason && result.reason !== 'dismissed') {
        Alert.alert('Payment incomplete', result.reason);
      }
    },
    [activeGateway?.slug, checkoutSession?.amount, data, navigation, refetch, retryAmount],
  );

  const filterHeader = (
    <View style={styles.filters}>
      <CustomerFilterChips
        chips={PAYMENT_STATUS_FILTERS}
        selectedId={statusFilter}
        onSelect={(id) => setStatusFilter(id as PaymentStatusFilter)}
      />
      <GlassCard padded contentStyle={styles.dateCard}>
        <Text style={styles.dateLabel}>Filter by date</Text>
        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onFromChange={setDateFrom}
          onToChange={setDateTo}
          accentColor={theme.colors.primary}
          accentTint={theme.colors.accentPrimaryMuted}
        />
      </GlassCard>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.canvas}>
        {filterHeader}
        <CustomerSkeletonLoader rows={5} rowHeight={88} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.canvas}>
        {filterHeader}
        <CustomerErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </View>
    );
  }

  return (
    <View style={styles.canvas}>
      <DismissKeyboardFlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={filterHeader}
        contentContainerStyle={filtered.length === 0 ? styles.listEmpty : styles.list}
        ListEmptyComponent={
          <CustomerEmptyState
            title={statusFilter === 'all' ? 'No payments yet' : `No ${statusFilter} payments`}
            subtitle={
              statusFilter === 'all'
                ? 'Your payment history will appear here after you pay a bill'
                : 'Try another filter or date range'
            }
            icon="💳"
          />
        }
        renderItem={({ item }) => (
          <PaymentHistoryRow
            item={item}
            onPress={() => setSelectedPaymentId(item.id)}
            onDownloadReceipt={
              item.status === 'confirmed'
                ? (id) => void onReceipt(id, 'confirmed')
                : undefined
            }
            downloadingReceiptId={downloadingReceiptId}
          />
        )}
      />

      <CustomerPaymentDetailSheet
        paymentId={selectedPaymentId}
        visible={Boolean(selectedPaymentId)}
        onClose={() => setSelectedPaymentId(null)}
        onDownloadReceipt={(id) => void onReceipt(id)}
        downloadingReceiptId={downloadingReceiptId}
        onRetryPayment={(id) => void onRetryPayment(id)}
        retryLoading={orderLoading}
      />

      {RazorpayUI}

      {user ? (
        <EasebuzzCheckout
          visible={checkoutVisible}
          session={checkoutSession}
          customer={{ name: user.name, email: user.email, phone: '' }}
          onClose={() => {
            setCheckoutVisible(false);
            setCheckoutSession(null);
          }}
          onComplete={onCheckoutComplete}
        />
      ) : null}
    </View>
  );
}

function PaymentHistoryRow({
  item,
  onPress,
  onDownloadReceipt,
  downloadingReceiptId,
}: {
  item: PaymentRecord;
  onPress: () => void;
  onDownloadReceipt?: (paymentId: string) => void;
  downloadingReceiptId?: string | null;
}) {
  const styles = useThemedStyles(createRowStyles);
  const { theme } = useCustomerTheme();
  const isDownloading = downloadingReceiptId === item.id;

  return (
    <PressableScale style={styles.wrap} onPress={onPress} accessibilityLabel={`Payment ${item.payment_number}`}>
      <GlassCard padded contentStyle={styles.card}>
        <View style={styles.top}>
          <View style={styles.left}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="file-document-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.meta}>
              <Text style={styles.period}>{paymentPeriodLabel(item)}</Text>
              <Text style={styles.number}>Inv #{item.payment_number}</Text>
            </View>
          </View>
          <View style={styles.topRight}>
            <Text style={styles.amount}>{formatINR(item.total_amount)}</Text>
            {onDownloadReceipt ? (
              <PressableScale
                style={styles.downloadBtn}
                onPress={() => onDownloadReceipt(item.id)}
                disabled={isDownloading}
                accessibilityLabel="Download receipt"
              >
                <MaterialCommunityIcons
                  name={isDownloading ? 'progress-download' : 'download-outline'}
                  size={20}
                  color={theme.colors.primary}
                />
              </PressableScale>
            ) : null}
          </View>
        </View>
        <View style={styles.bottom}>
          <Text style={styles.method}>
            {item.method.toUpperCase()}
            {item.gateway_slug ? ` · ${item.gateway_slug}` : ''}
          </Text>
          <CustomerPaymentStatusPill status={item.status} />
        </View>
      </GlassCard>
    </PressableScale>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    canvas: { flex: 1, backgroundColor: theme.colors.bgDeep },
    filters: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.md,
    },
    dateCard: {
      gap: theme.spacing.sm,
    },
    dateLabel: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.bodyMedium,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    list: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    },
    listEmpty: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
      flexGrow: 1,
      justifyContent: 'flex-start',
    },
  });

const createRowStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    wrap: { marginBottom: theme.spacing.sm },
    card: { gap: theme.spacing.sm },
    top: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      flex: 1,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.accentPrimaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    meta: { flex: 1, minWidth: 0 },
    period: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
    },
    number: {
      ...theme.typography.caption,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.mono,
    },
    amount: {
      ...theme.typography.monoMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.monoBold,
    },
    topRight: {
      alignItems: 'flex-end',
      gap: theme.spacing.xs,
    },
    downloadBtn: {
      padding: theme.spacing.xs,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.accentPrimaryMuted,
    },
    bottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    method: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.body,
      textTransform: 'uppercase',
      flex: 1,
    },
  });
