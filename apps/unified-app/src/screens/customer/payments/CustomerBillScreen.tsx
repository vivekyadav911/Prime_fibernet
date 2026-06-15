import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { AmountDisplay, BillingStatusBadge, type BillingStatus } from '@/components/payments';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useAppSelector } from '@/store/hooks';
import {
  useGetActivePaymentGatewayQuery,
  useGetCustomerBillQuery,
} from '@/services/api/paymentCollectionApi';
import { PAYMENT_METHOD_CONFIG, type PaymentMethod } from '@/types/payments';
import { formatINR } from '@/utils/currencyFormat';
import type { CustomerStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
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
      <Screen>
        <ErrorState message="Sign in to view your bill." />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={6} />
      </Screen>
    );
  }

  if (isError || !bill) {
    return (
      <Screen>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  const billingStatus = (bill.paymentStatus as BillingStatus) || 'pending';
  const overdue = billingStatus === 'overdue';

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>My Bill</Text>
            <Text style={styles.account}>Account {bill.accountNumber}</Text>
          </View>
          <BillingStatusBadge status={billingStatus} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Amount due</Text>
          <AmountDisplay amount={bill.totalPayable} large />
          {bill.dueDate ? (
            <Text style={[styles.due, overdue && styles.overdue]}>
              Due {formatDate(bill.dueDate)}
              {overdue ? ' · Please pay to avoid suspension' : ''}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
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
        </View>

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
              <Pressable key={m} style={styles.methodChip} onPress={() => onPay(m)}>
                <Text style={styles.methodIcon}>{cfg.icon}</Text>
                <Text style={styles.methodLabel}>{cfg.label}</Text>
              </Pressable>
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

        <Button label={`Pay ${formatINR(bill.totalPayable)} online`} onPress={() => onPay()} />
        <Button
          label="Payment history"
          variant="ghost"
          onPress={() => navigation.navigate('PaymentHistory')}
        />
      </ScrollView>
    </Screen>
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
  screen: { backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  title: { fontSize: 22, fontWeight: '700', color: colors.primaryNavy },
  account: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  hero: {
    backgroundColor: colors.primaryNavy,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  heroLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' },
  due: { marginTop: spacing.sm, fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  overdue: { color: '#FFCDD2', fontWeight: '600' },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  plan: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs },
  muted: { fontSize: 13, color: colors.textSecondary },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  value: { fontWeight: '600', color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.borderDefault, marginVertical: spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  lastPaid: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  lastPaidText: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  methodChip: {
    width: '22%',
    minWidth: 72,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
    alignItems: 'center',
  },
  methodIcon: { fontSize: 20 },
  methodLabel: { marginTop: 4, fontSize: 10, fontWeight: '600', color: colors.textSecondary },
  notice: {
    backgroundColor: '#FFF8E1',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  noticeTitle: { fontSize: 13, fontWeight: '700', color: '#F57F17', marginBottom: spacing.xs },
  noticeBody: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  gatewayHint: { textAlign: 'center', fontSize: 11, color: colors.textSecondary, marginBottom: spacing.sm },
});
