import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { AmountDisplay } from '@/components/payments';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useAppSelector } from '@/store/hooks';
import { useGetCustomerBillQuery } from '@/services/api/paymentCollectionApi';
import { formatINR } from '@/utils/currencyFormat';
import type { CustomerStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

export function CustomerBillScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  const user = useAppSelector((s) => s.auth.user);
  const customerId = user?.id ?? '';

  const { data: bill, isLoading, isError, error, refetch } = useGetCustomerBillQuery(customerId, {
    skip: !customerId,
  });

  const onPay = useCallback(() => {
    if (!bill) return;
    navigation.navigate('PaymentMethod', {
      amount: bill.totalPayable,
      planName: bill.planName ?? 'Broadband',
      customerId: bill.customerId,
    });
  }, [bill, navigation]);

  if (!customerId) {
    return <Screen><ErrorState message="Sign in to view your bill." /></Screen>;
  }

  if (isLoading) return <Screen><SkeletonLoader rows={6} /></Screen>;
  if (isError || !bill) {
    return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;
  }

  const overdue = bill.paymentStatus === 'overdue';

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>My Bill</Text>
      <View style={styles.card}>
        <Text style={styles.plan}>{bill.planName ?? 'Broadband plan'}</Text>
        {bill.billingPeriodStart && bill.billingPeriodEnd ? (
          <Text style={styles.muted}>Billing: {bill.billingPeriodStart} – {bill.billingPeriodEnd}</Text>
        ) : null}
        {bill.dueDate ? (
          <Text style={[styles.due, overdue && styles.overdue]}>Due: {bill.dueDate}{overdue ? ' · Overdue' : ''}</Text>
        ) : null}
      </View>
      <View style={styles.card}>
        <Row label="Plan amount" value={formatINR(bill.planAmount)} />
        <Row label="GST (18%)" value={formatINR(bill.taxAmount)} />
        <Row label="Late fee" value={formatINR(bill.lateFee)} />
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total payable</Text>
          <AmountDisplay amount={bill.totalPayable} large />
        </View>
      </View>
      <Button label={`Pay ${formatINR(bill.totalPayable)} online`} onPress={onPay} />
      <Text style={styles.hint}>Or pay cash to your field officer / at our office</Text>
      <Button
        label="Payment history"
        variant="ghost"
        onPress={() => navigation.navigate('PaymentHistory')}
      />
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
  screen: { padding: spacing.md, backgroundColor: colors.background },
  title: { fontSize: 20, fontWeight: '700', color: colors.primaryNavy, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  plan: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  muted: { fontSize: 13, color: colors.textSecondary },
  due: { marginTop: spacing.xs, fontSize: 13, color: colors.textPrimary },
  overdue: { color: colors.errorRed, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  value: { fontWeight: '600', color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.borderDefault, marginVertical: spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  hint: { textAlign: 'center', marginTop: spacing.md, fontSize: 12, color: colors.textSecondary },
});
