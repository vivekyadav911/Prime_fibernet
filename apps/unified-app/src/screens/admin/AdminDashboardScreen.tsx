import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ErrorState, KpiCard, Screen } from '@prime/ui';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import { useGetAnalyticsReportQuery, useGetDashboardKpisQuery } from '@/store/api/endpoints';

export function AdminDashboardScreen() {
  const { data, isLoading, error, refetch } = useGetDashboardKpisQuery();
  const { data: report } = useGetAnalyticsReportQuery();

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={colors.primaryNavy} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState message="Failed to load dashboard" onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Admin dashboard</Text>
      <View style={styles.grid}>
        <KpiCard label="Active subscribers" value={data?.activeSubscribers ?? 0} />
        <KpiCard label="MRR (₹)" value={data?.mrr ?? 0} />
        <KpiCard label="Open requests" value={data?.openRequests ?? 0} />
        <KpiCard label="Officers online" value={data?.officersOnline ?? 0} />
      </View>
      {report ? (
        <View style={styles.report}>
          <Text style={styles.reportTitle}>Quick stats</Text>
          <Text style={styles.reportRow}>Total revenue: ₹{report.totalRevenue.toFixed(0)}</Text>
          <Text style={styles.reportRow}>Avg resolution: {report.avgResolutionHours}h</Text>
          <Text style={styles.reportRow}>Attendance rate: {report.attendanceRate}%</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  report: { marginTop: spacing.xl, padding: spacing.md, backgroundColor: colors.background, borderRadius: radius.md },
  reportTitle: { fontWeight: '600', marginBottom: 8 },
  reportRow: { color: colors.textSecondary, marginTop: 4 },
});
