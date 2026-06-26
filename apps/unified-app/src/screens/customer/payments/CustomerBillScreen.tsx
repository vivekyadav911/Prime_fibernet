import { useCallback } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';

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
import { useAppSelector } from '@/store/hooks';
import {
  useGetActivePaymentGatewayQuery,
  useGetCustomerBillQuery,
  useGetCustomerPaymentHistoryV2Query,
  useLazyGetPaymentReceiptQuery,
} from '@/services/api/paymentCollectionApi';
import { PAYMENT_METHOD_CONFIG, type PaymentMethod } from '@/types/payments';
import type { PaymentRecord } from '@/types/payments';
import { formatINR } from '@/utils/currencyFormat';
import type { CustomerStackParamList } from '@/types/navigation';
import { signalGlass } from '@/theme/customer/signalGlass';
import { queryErrorMessage } from '@/utils/queryError';

const QUICK_METHODS: PaymentMethod[] = ['upi', 'card', 'netbanking', 'wallet'];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function statusTone(status: PaymentRecord['status']): 'paid' | 'failed' | 'pending' {
  if (status === 'confirmed') return 'paid';
  if (status === 'failed' || status === 'cancelled') return 'failed';
  return 'pending';
}

export function CustomerBillScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  const user = useAppSelector((s) => s.auth.user);
  const authId = user?.id ?? '';

  const { data: bill, isLoading, isError, error, refetch } = useGetCustomerBillQuery(authId, {
    skip: !authId,
  });
  const { data: history = [], isLoading: historyLoading } = useGetCustomerPaymentHistoryV2Query(authId, {
    skip: !authId,
  });
  const { data: activeGateway } = useGetActivePaymentGatewayQuery();
  const [fetchReceipt] = useLazyGetPaymentReceiptQuery();

  const onPay = useCallback(
    (method?: PaymentMethod) => {
      if (!bill) return;
      navigation.navigate('PaymentMethod', {
        amount: bill.totalPayable,
        planName: bill.planName ?? 'Broadband',
        customerId: bill.customerId,
        paymentMethod: method,
      });
    },
    [bill, navigation],
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

  return (
    <View style={styles.canvas}>
      <CustomerTopBar onNotificationsPress={() => navigation.navigate('Notifications')} />
      <DismissKeyboardScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.balanceCard} glow padded>
          <Text style={styles.balanceTitle}>Outstanding Balance</Text>
          {bill.dueDate ? (
            <Text style={styles.balanceDue}>Due by {formatDate(bill.dueDate)}</Text>
          ) : null}
          <Text style={styles.balanceAmount}>{formatINR(bill.totalPayable)}</Text>
          <CustomerButton label="Pay Now" icon="credit-card-outline" onPress={() => onPay()} />
        </GlassCard>

        <GlassCard style={styles.quickCard} padded>
          <View style={styles.quickRow}>
            {QUICK_METHODS.slice(0, 2).map((m) => {
              const cfg = PAYMENT_METHOD_CONFIG[m];
              return (
                <PressableScale key={m} style={styles.quickAction} onPress={() => onPay(m)}>
                  <MaterialCommunityIcons name="receipt" size={24} color={signalGlass.colors.primary} />
                  <Text style={styles.quickLabel}>{cfg.label === 'UPI' ? 'Auto-Pay' : cfg.label}</Text>
                </PressableScale>
              );
            })}
          </View>
        </GlassCard>

        <GlassCard style={styles.historyCard} padded>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Payment History</Text>
            <PressableScale accessibilityLabel="Filter payments">
              <View style={styles.filterBtn}>
                <MaterialCommunityIcons name="filter-variant" size={18} color={signalGlass.colors.primary} />
                <Text style={styles.filterText}>Filter</Text>
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
            history.map((item) => {
              const tone = statusTone(item.status);
              return (
                <PressableScale
                  key={item.id}
                  style={styles.historyItem}
                  onPress={() => item.status === 'confirmed' && void onReceipt(item.id)}
                >
                  <View style={styles.historyLeft}>
                    <View style={[styles.historyIcon, tone === 'failed' && styles.historyIconError]}>
                      <MaterialCommunityIcons
                        name={tone === 'failed' ? 'alert' : 'file-document-outline'}
                        size={20}
                        color={tone === 'failed' ? signalGlass.colors.error : signalGlass.colors.primary}
                      />
                    </View>
                    <View>
                      <Text style={styles.historyMonth}>{formatMonthYear(item.created_at)}</Text>
                      <Text style={styles.historyInv}>Inv #{item.payment_number}</Text>
                    </View>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyAmount}>{formatINR(item.total_amount)}</Text>
                    <View style={[styles.statusPill, tone === 'paid' && styles.statusPaid, tone === 'failed' && styles.statusFailed]}>
                      <View style={[styles.statusDot, tone === 'paid' && styles.statusDotPaid, tone === 'failed' && styles.statusDotFailed]} />
                      <Text style={[styles.statusText, tone === 'paid' && styles.statusTextPaid, tone === 'failed' && styles.statusTextFailed]}>
                        {tone === 'paid' ? 'Paid' : tone === 'failed' ? 'Failed' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                </PressableScale>
              );
            })
          )}
        </GlassCard>

        {!activeGateway ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Online checkout coming soon</Text>
            <Text style={styles.noticeBody}>
              Your admin is setting up the payment gateway. You can still pay cash to your field officer or at our office.
            </Text>
          </View>
        ) : (
          <Text style={styles.gatewayHint}>Secured by {activeGateway.display_name}</Text>
        )}
      </DismissKeyboardScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: signalGlass.colors.bgDeep },
  body: { flex: 1, padding: signalGlass.spacing.marginMobile },
  scroll: {
    paddingHorizontal: signalGlass.spacing.marginMobile,
    paddingTop: signalGlass.spacing.md,
    paddingBottom: signalGlass.spacing.xxxl,
    gap: signalGlass.spacing.md,
  },
  balanceCard: {
    borderRadius: signalGlass.radius.lg,
    gap: signalGlass.spacing.sm,
    overflow: 'hidden',
  },
  balanceTitle: {
    ...signalGlass.typography.displayMd,
    color: signalGlass.colors.onSurface,
    fontFamily: signalGlass.fonts.bodySemiBold,
  },
  balanceDue: {
    ...signalGlass.typography.body,
    color: signalGlass.colors.onSurfaceVariant,
    fontFamily: signalGlass.fonts.body,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: signalGlass.colors.primary,
    fontFamily: signalGlass.fonts.monoBold,
    marginVertical: signalGlass.spacing.sm,
  },
  quickCard: { borderRadius: signalGlass.radius.lg },
  quickRow: { flexDirection: 'row', gap: signalGlass.spacing.sm },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: signalGlass.spacing.sm,
    borderRadius: signalGlass.radius.sm,
    gap: signalGlass.spacing.xs,
    minHeight: 72,
  },
  quickLabel: {
    ...signalGlass.typography.caption,
    color: signalGlass.colors.onSurfaceVariant,
    fontFamily: signalGlass.fonts.bodyMedium,
  },
  historyCard: { borderRadius: signalGlass.radius.lg },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: signalGlass.spacing.md,
    paddingBottom: signalGlass.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: signalGlass.colors.borderSubtle,
  },
  historyTitle: {
    ...signalGlass.typography.displayMd,
    color: signalGlass.colors.onSurface,
    fontFamily: signalGlass.fonts.bodySemiBold,
  },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  filterText: {
    ...signalGlass.typography.caption,
    color: signalGlass.colors.primary,
    fontFamily: signalGlass.fonts.bodyMedium,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: signalGlass.spacing.sm,
    borderRadius: signalGlass.radius.sm,
    backgroundColor: signalGlass.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: signalGlass.spacing.sm,
  },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: signalGlass.spacing.sm, flex: 1 },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: signalGlass.colors.accentPrimaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIconError: { backgroundColor: 'rgba(147,0,10,0.2)' },
  historyMonth: {
    ...signalGlass.typography.bodyLg,
    color: signalGlass.colors.onSurface,
    fontFamily: signalGlass.fonts.body,
    fontSize: 16,
  },
  historyInv: {
    ...signalGlass.typography.caption,
    color: signalGlass.colors.onSurfaceVariant,
    fontFamily: signalGlass.fonts.bodyMedium,
  },
  historyRight: { alignItems: 'flex-end', gap: signalGlass.spacing.xs },
  historyAmount: {
    ...signalGlass.typography.monoMd,
    color: signalGlass.colors.onSurface,
    fontFamily: signalGlass.fonts.mono,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: signalGlass.radius.pill,
    borderWidth: 1,
    minWidth: 72,
    justifyContent: 'center',
  },
  statusPaid: {
    backgroundColor: 'rgba(0,165,114,0.2)',
    borderColor: 'rgba(78,222,163,0.3)',
  },
  statusFailed: {
    backgroundColor: 'rgba(147,0,10,0.2)',
    borderColor: 'rgba(255,180,171,0.3)',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotPaid: { backgroundColor: signalGlass.colors.secondary },
  statusDotFailed: { backgroundColor: signalGlass.colors.error },
  statusText: { ...signalGlass.typography.caption, fontSize: 11 },
  statusTextPaid: { color: signalGlass.colors.secondary },
  statusTextFailed: { color: signalGlass.colors.error },
  notice: {
    backgroundColor: signalGlass.colors.accentPrimaryMuted,
    borderRadius: signalGlass.radius.md,
    padding: signalGlass.spacing.md,
    borderWidth: 1,
    borderColor: signalGlass.colors.accentWarning,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: signalGlass.colors.accentWarning,
    marginBottom: signalGlass.spacing.xs,
  },
  noticeBody: { fontSize: 12, color: signalGlass.colors.textSecondary, lineHeight: 18 },
  gatewayHint: {
    textAlign: 'center',
    fontSize: 11,
    color: signalGlass.colors.textMuted,
  },
});
