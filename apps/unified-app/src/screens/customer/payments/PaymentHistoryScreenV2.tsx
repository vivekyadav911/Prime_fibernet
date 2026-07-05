import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, StyleSheet, Text, View } from 'react-native';
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
import type { PaymentRecord } from '@/types/payments';
import type { CustomerStackParamList } from '@/types/navigation';
import type { CustomerTheme } from '@/theme/customer';
import { formatINR } from '@/utils/currencyFormat';
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
  const [rzpLoading, setRzpLoading] = useState(false);
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
          });
        }
      };

      tick();
      const intervalId = setInterval(tick, 15_000);
      return () => clearInterval(intervalId);
    }, [activeGateway?.slug, pendingPayments, pollVerification]),
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
    async (paymentId: string) => {
      setDownloadingReceiptId(paymentId);
      try {
        const result = await fetchReceipt(paymentId).unwrap();
        if (result.url) {
          await Linking.openURL(result.url);
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
          setRzpLoading(true);
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
                setRzpLoading(false);
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
          return;
        }

        setCheckoutSession(checkoutSession);
        setCheckoutVisible(true);
      } catch (e) {
        setRzpLoading(false);
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
          <PaymentHistoryRow item={item} onPress={() => setSelectedPaymentId(item.id)} />
        )}
      />

      <CustomerPaymentDetailSheet
        paymentId={selectedPaymentId}
        visible={Boolean(selectedPaymentId)}
        onClose={() => setSelectedPaymentId(null)}
        onDownloadReceipt={(id) => void onReceipt(id)}
        downloadingReceiptId={downloadingReceiptId}
        onRetryPayment={(id) => void onRetryPayment(id)}
        retryLoading={orderLoading || rzpLoading}
      />

      {RazorpayUI}

      <Modal visible={rzpLoading} transparent animationType="fade">
        <View style={styles.rzpOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.rzpLoadingText}>Opening secure checkout…</Text>
        </View>
      </Modal>

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

function PaymentHistoryRow({ item, onPress }: { item: PaymentRecord; onPress: () => void }) {
  const styles = useThemedStyles(createRowStyles);
  const { theme } = useCustomerTheme();

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
          <Text style={styles.amount}>{formatINR(item.total_amount)}</Text>
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
