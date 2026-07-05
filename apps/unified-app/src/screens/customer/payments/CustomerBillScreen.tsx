import { useCallback, useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';

import { EasebuzzCheckout } from '@/components/customer/payments/EasebuzzCheckout';
import { CustomerPaymentDetailSheet } from '@/components/customer/payments/CustomerPaymentDetailSheet';
import { CustomerPaymentStatusPill } from '@/components/customer/payments/CustomerPaymentStatusPill';
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
import {
  useCreatePaymentOrderV2Mutation,
  useGetActivePaymentGatewayQuery,
  useGetCustomerBillQuery,
  useGetCustomerPaymentHistoryV2Query,
  useLazyGetPaymentReceiptQuery,
} from '@/services/api/paymentCollectionApi';
import type { PaymentCheckoutSession } from '@/services/payment/PaymentProvider';
import { getPaymentProvider, resolvePaymentProviderSlug } from '@/services/payment/PaymentProvider';
import type { CustomerStackParamList } from '@/types/navigation';
import type { CustomerTheme } from '@/theme/customer';
import { formatINR } from '@/utils/currencyFormat';
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

export function CustomerBillScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();
  const { authUser: user, userId } = useCustomerIdentity();
  const authId = userId;

  const [checkoutSession, setCheckoutSession] = useState<PaymentCheckoutSession | null>(null);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [payMode, setPayMode] = useState<'bill' | 'advance' | 'retry'>('bill');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const { data: bill, isLoading, isError, error, refetch } = useGetCustomerBillQuery(authId, {
    skip: !authId,
  });
  const { data: history = [], isLoading: historyLoading, refetch: refetchHistory } = useGetCustomerPaymentHistoryV2Query(
    authId,
    { skip: !authId },
  );
  const { data: activeGateway } = useGetActivePaymentGatewayQuery();
  const [createOrder, { isLoading: orderLoading }] = useCreatePaymentOrderV2Mutation();
  const [fetchReceipt] = useLazyGetPaymentReceiptQuery();

  const provider = getPaymentProvider(resolvePaymentProviderSlug(activeGateway?.slug));
  const payButtonLabel =
    activeGateway?.slug === 'easebuzz' ? 'Pay Now via Easebuzz' : `Pay Now via ${provider.displayName}`;

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

        setCheckoutSession({
          paymentId: session.paymentId,
          orderId: session.orderId,
          gatewaySlug: resolvePaymentProviderSlug(session.gatewaySlug),
          keyId: session.keyId,
          amount: session.amount,
          checkoutUrl: session.checkoutUrl,
          checkoutParams: session.checkoutParams,
        });
        setCheckoutVisible(true);
      } catch (e) {
        const message = queryErrorMessage(e);
        if (isGatewayNotConfigured(message)) {
          Alert.alert(
            'Online payments unavailable',
            'Your ISP is finishing payment gateway setup. You can pay cash to your field officer or visit our office.',
          );
        } else {
          Alert.alert('Could not start checkout', message);
        }
      }
    },
    [bill, createOrder, user],
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
        setCheckoutSession({
          paymentId: session.paymentId,
          orderId: session.orderId,
          gatewaySlug: resolvePaymentProviderSlug(session.gatewaySlug),
          keyId: session.keyId,
          amount: session.amount,
          checkoutUrl: session.checkoutUrl,
          checkoutParams: session.checkoutParams,
        });
        setCheckoutVisible(true);
      } catch (e) {
        const message = queryErrorMessage(e);
        if (isGatewayNotConfigured(message)) {
          Alert.alert(
            'Online payments unavailable',
            'Your ISP is finishing payment gateway setup. You can pay cash to your field officer or visit our office.',
          );
        } else {
          Alert.alert('Could not start checkout', message);
        }
      }
    },
    [bill?.planName, createOrder, history, user],
  );

  const onCheckoutComplete = useCallback(
    (result: { success: boolean; paymentId: string; orderId?: string; reason?: string }) => {
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
        });
        void refetch();
        void refetchHistory();
        return;
      }

      if (result.reason && result.reason !== 'dismissed') {
        Alert.alert('Payment incomplete', result.reason);
      }
    },
    [activeGateway?.slug, bill, navigation, refetch, refetchHistory],
  );

  const onReceipt = useCallback(
    async (paymentId: string) => {
      try {
        const result = await fetchReceipt(paymentId).unwrap();
        if (result.url && (await Sharing.isAvailableAsync())) {
          await Share.share({ url: result.url, message: `Receipt ${result.receiptNumber}` });
        } else {
          navigation.navigate('Receipt', { paymentId });
        }
      } catch (e) {
        Alert.alert('Receipt unavailable', e instanceof Error ? e.message : 'Try again in a moment.');
      }
    },
    [fetchReceipt, navigation],
  );

  if (!authId) {
    return (
      <View style={styles.canvas}>
        <CustomerTopBar onNotificationsPress={() => navigation.navigate('Notifications')} />
        <CustomerErrorState message="Sign in to view payments." />
      </View>
    );
  }

  if (isLoading || historyLoading) {
    return (
      <View style={styles.canvas}>
        <CustomerTopBar onNotificationsPress={() => navigation.navigate('Notifications')} />
        <View style={styles.body}>
          <CustomerSkeletonLoader rows={6} rowHeight={72} />
        </View>
      </View>
    );
  }

  if (isError || !bill) {
    return (
      <View style={styles.canvas}>
        <CustomerTopBar onNotificationsPress={() => navigation.navigate('Notifications')} />
        <CustomerErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </View>
    );
  }

  const hasOutstanding = bill.outstandingAmount > 0;
  const payLoadingLabel = 'Starting checkout…';

  return (
    <View style={styles.canvas}>
      <CustomerTopBar onNotificationsPress={() => navigation.navigate('Notifications')} />
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
              disabled={orderLoading}
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
                disabled={orderLoading}
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

      <CustomerPaymentDetailSheet
        paymentId={selectedPaymentId}
        visible={Boolean(selectedPaymentId)}
        onClose={() => setSelectedPaymentId(null)}
        onDownloadReceipt={(id) => void onReceipt(id)}
        onRetryPayment={(id) => void onRetryPayment(id)}
        retryLoading={orderLoading && payMode === 'retry'}
      />

      {user ? (
        <EasebuzzCheckout
          visible={checkoutVisible}
          session={checkoutSession}
          customer={{
            name: user.name,
            email: user.email,
            phone: '',
          }}
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
  });
