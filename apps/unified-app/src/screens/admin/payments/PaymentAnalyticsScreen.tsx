import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { Screen } from '@prime/ui';

import { AdminKPICard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { usePaymentAnalytics } from '@/hooks/usePayments';
import { formatINR } from '@/utils/currencyFormat';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

export function PaymentAnalyticsScreen() {
  const { data, isLoading, isError, error, refetch } = usePaymentAnalytics();

  const totals = useMemo(() => {
    const rows = data ?? [];
    return {
      confirmedRevenue: rows.reduce((s, r) => s + r.confirmed_revenue, 0),
      pendingReview: rows.reduce((s, r) => s + r.pending_review_count, 0),
      cashPending: rows.reduce((s, r) => s + r.cash_pending_count, 0),
      failed: rows.reduce((s, r) => s + r.failed_count, 0),
      avg: rows.length ? rows.reduce((s, r) => s + r.avg_payment_amount, 0) / rows.length : 0,
      initiated: rows.reduce((s, r) => s + r.total_transactions, 0),
      confirmed: rows.reduce((s, r) => s + r.confirmed_count, 0),
    };
  }, [data]);

  const chartData = useMemo(
    () =>
      (data ?? []).slice(0, 14).reverse().map((r) => ({
        value: r.confirmed_revenue,
        label: r.date.slice(5),
        frontColor: adminColors.primary,
      })),
    [data],
  );

  const methodData = useMemo(() => {
    const rows = data ?? [];
    return [
      { value: rows.reduce((s, r) => s + r.upi_count, 0), label: 'UPI', frontColor: adminColors.primary },
      { value: rows.reduce((s, r) => s + r.card_count, 0), label: 'Card', frontColor: colors.accentTeal },
      { value: rows.reduce((s, r) => s + r.cash_count, 0), label: 'Cash', frontColor: adminColors.badgeActive },
    ];
  }, [data]);

  if (isLoading) return <Screen><SkeletonLoader rows={6} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  const collectionRate =
    totals.initiated > 0 ? Math.round((totals.confirmed / totals.initiated) * 100) : 0;

  return (
    <Screen style={[adminScreenStyles.canvas, styles.screenPadding]}>
      <ScrollView>
        <View style={styles.kpiRow}>
          <AdminKPICard label="Collected" value={formatINR(totals.confirmedRevenue)} />
          <AdminKPICard label="Pending review" value={String(totals.pendingReview)} />
        </View>
        <View style={styles.kpiRow}>
          <AdminKPICard label="Cash pending" value={String(totals.cashPending)} />
          <AdminKPICard label="Failed" value={String(totals.failed)} />
        </View>
        <View style={styles.kpiRow}>
          <AdminKPICard label="Avg payment" value={formatINR(totals.avg)} />
          <AdminKPICard label="Collection rate" value={`${collectionRate}%`} />
        </View>

        <Text style={styles.chartTitle}>Revenue over time</Text>
        <BarChart data={chartData} barWidth={22} spacing={12} height={180} yAxisTextStyle={styles.axis} />

        <Text style={styles.chartTitle}>Payment methods</Text>
        <BarChart data={methodData} barWidth={40} spacing={24} height={160} yAxisTextStyle={styles.axis} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({  screenPadding: { padding: spacing.md },
  kpiRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  chartTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginVertical: spacing.md },
  axis: { fontSize: 10, color: colors.textSecondary },
});
