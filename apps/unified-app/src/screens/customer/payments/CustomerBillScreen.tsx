import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';

import { AmountDisplay, BillingStatusBadge, type BillingStatus } from '@/components/payments';
import {
  CustomerButton,
  CustomerErrorState,
  CustomerSkeletonLoader,
  GlassCard,
  PressableScale,
} from '@/components/customer/ui';
import { DismissKeyboardScrollView } from '@/components/common';
import { useAppSelector } from '@/store/hooks';
import {
  useGetActivePaymentGatewayQuery,
  useGetCustomerBillQuery,
} from '@/services/api/paymentCollectionApi';
import { PAYMENT_METHOD_CONFIG, type PaymentMethod } from '@/types/payments';
import { formatINR } from '@/utils/currencyFormat';
import type { CustomerStackParamList } from '@/types/navigation';
import { signalGlass } from '@/theme/customer/signalGlass';
import { queryErrorMessage } from '@/utils/queryError';

const QUICK_METHODS: PaymentMethod[] = ['upi', 'card', 'netbanking', 'wallet'];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function CustomerBillScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  const user = useAppSelector((s) => s.auth.user);
  const authId = user?.id ?? '';

  const { data: bill, isLoading, isError, error, refetch } = useGetCustomerBillQuery(authId, {
    skip: !authId,
  });
  const { data: activeGateway } = useGetActivePaymentGatewayQuery();

  const onPay = useCallback(
    (method?: PaymentMethod) => {
      if (!bill) return;
      if (!activeGateway) {
        navigation.navigate('PaymentMethod', {
          amount: bill.totalPayable,
          planName: bill.planName ?? 'Broadband',
          customerId: bill.customerId,
          paymentMethod: method,
        });
        return;
      }
      if (method) {
        navigation.navigate('GatewayWebView', {
          amount: bill.totalPayable,
          planName: bill.planName ?? 'Broadband',
          customerId: bill.customerId,
          paymentMethod: method,
        });
        return;
      }
      navigation.navigate('PaymentMethod', {
        amount: bill.totalPayable,
        planName: bill.planName ?? 'Broadband',
        customerId: bill.customerId,
      });
    },
    [activeGateway, bill, navigation],
  );

  if (!authId) {
    return (
      <View style={styles.canvas}>
        <CustomerErrorState message="Sign in to view your bill." />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.canvas}>
        <CustomerSkeletonLoader rows={6} rowHeight={72} />
      </View>
    );
  }

  if (isError || !bill) {
    return (
      <View style={styles.canvas}>
        <CustomerErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </View>
    );
  }

  const billingStatus = (bill.paymentStatus as BillingStatus) || 'pending';
  const overdue = billingStatus === 'overdue';

  return (
    <View style={styles.canvas}>
      <DismissKeyboardScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>My Bill</Text>
            <Text style={styles.account} numberOfLines={1}>
              Account {bill.accountNumber}
            </Text>
          </View>
          <BillingStatusBadge status={billingStatus} />
        </View>

        <LinearGradient colors={[...signalGlass.gradients.hero]} style={styles.hero}>
          <Text style={styles.heroLabel}>Amount due</Text>
          <AmountDisplay amount={bill.totalPayable} large />
          {bill.dueDate ? (
            <Text style={[styles.due, overdue && styles.overdue]}>
              Due {formatDate(bill.dueDate)}
              {overdue ? ' · Please pay to avoid suspension' : ''}
            </Text>
          ) : null}
        </LinearGradient>

        <GlassCard style={styles.card}>
          <Text style={styles.plan}>{bill.planName ?? 'Broadband plan'}</Text>
          {bill.billingPeriodStart && bill.billingPeriodEnd ? (
            <Text style={styles.muted}>
              Billing period: {formatDate(bill.billingPeriodStart)} – {formatDate(bill.billingPeriodEnd)}
            </Text>
          ) : null}
          <View style={styles.divider} />
          <Row label="Plan amount" value={formatINR(bill.planAmount)} />
          <Row label="GST (18%)" value={formatINR(bill.taxAmount)} />
          {bill.lateFee > 0 ? <Row label="Late fee" value={formatINR(bill.lateFee)} /> : null}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total payable</Text>
            <AmountDisplay amount={bill.totalPayable} large />
          </View>
        </GlassCard>

        {bill.lastPaidAt ? (
          <View style={styles.lastPaid}>
            <Text style={styles.lastPaidText}>
              Last paid {formatINR(bill.lastPaidAmount ?? 0)} on {formatDate(bill.lastPaidAt)}
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Quick pay</Text>
        <View style={styles.methodRow}>
          {QUICK_METHODS.map((m) => {
            const cfg = PAYMENT_METHOD_CONFIG[m];
            return (
              <PressableScale
                key={m}
                style={styles.methodChip}
                onPress={() => onPay(m)}
                accessibilityLabel={`Pay with ${cfg.label}`}
              >
                <Text style={styles.methodIcon}>{cfg.icon}</Text>
                <Text style={styles.methodLabel}>{cfg.label}</Text>
              </PressableScale>
            );
          })}
        </View>

        {!activeGateway ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Online checkout coming soon</Text>
            <Text style={styles.noticeBody}>
              Your admin is setting up the payment gateway. You can still pay cash to your field officer or at our
              office.
            </Text>
          </View>
        ) : (
          <Text style={styles.gatewayHint}>Secured by {activeGateway.display_name}</Text>
        )}

        <CustomerButton label={`Pay ${formatINR(bill.totalPayable)}`} onPress={() => onPay()} />
        <CustomerButton
          label="Payment history"
          variant="ghost"
          onPress={() => navigation.navigate('PaymentHistory')}
        />
      </DismissKeyboardScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: signalGlass.colors.bgDeep },
  scroll: { padding: signalGlass.spacing.lg, paddingBottom: signalGlass.spacing.xxxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: signalGlass.spacing.md,
    gap: signalGlass.spacing.sm,
  },
  headerText: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.display,
  },
  account: { fontSize: 12, color: signalGlass.colors.textSecondary, marginTop: 2 },
  hero: {
    borderRadius: signalGlass.radius.lg,
    padding: signalGlass.spacing.lg,
    marginBottom: signalGlass.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: signalGlass.colors.textSecondary,
    textTransform: 'uppercase',
  },
  due: { marginTop: signalGlass.spacing.sm, fontSize: 13, color: signalGlass.colors.textPrimary },
  overdue: { color: signalGlass.colors.accentDanger, fontWeight: '600' },
  card: { marginBottom: signalGlass.spacing.md },
  plan: {
    fontSize: 16,
    fontWeight: '600',
    color: signalGlass.colors.textPrimary,
    marginBottom: signalGlass.spacing.xs,
  },
  muted: { fontSize: 13, color: signalGlass.colors.textSecondary },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: signalGlass.spacing.xs },
  value: { fontWeight: '600', color: signalGlass.colors.textPrimary, fontFamily: signalGlass.fonts.mono },
  divider: { height: 1, backgroundColor: signalGlass.colors.borderSubtle, marginVertical: signalGlass.spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 15, fontWeight: '600', color: signalGlass.colors.textPrimary },
  lastPaid: {
    backgroundColor: signalGlass.colors.bgGlass,
    borderRadius: signalGlass.radius.sm,
    padding: signalGlass.spacing.sm,
    marginBottom: signalGlass.spacing.md,
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
  },
  lastPaidText: { fontSize: 12, color: signalGlass.colors.textSecondary, textAlign: 'center' },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: signalGlass.colors.textPrimary,
    marginBottom: signalGlass.spacing.sm,
  },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: signalGlass.spacing.sm, marginBottom: signalGlass.spacing.md },
  methodChip: {
    width: '22%',
    minWidth: 72,
    minHeight: 44,
    paddingVertical: signalGlass.spacing.sm,
    borderRadius: signalGlass.radius.md,
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
    backgroundColor: signalGlass.colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIcon: { fontSize: 20 },
  methodLabel: { marginTop: 4, fontSize: 10, fontWeight: '600', color: signalGlass.colors.textSecondary },
  notice: {
    backgroundColor: signalGlass.colors.accentPrimaryMuted,
    borderRadius: signalGlass.radius.md,
    padding: signalGlass.spacing.md,
    marginBottom: signalGlass.spacing.md,
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
    marginBottom: signalGlass.spacing.sm,
  },
});
