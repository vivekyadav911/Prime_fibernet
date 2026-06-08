import { StyleSheet, Text, View } from 'react-native';
import { Button, KpiCard, Screen, colors } from '@prime/ui';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { getSupabase } from '@/services/supabase';
import { useGetAnalyticsReportQuery } from '@/store/api/endpoints';
import { queryErrorMessage } from '@/utils/queryError';

export function AdminAnalyticsScreen() {
  const { data, isLoading, isError, error, refetch } = useGetAnalyticsReportQuery();

  const onExport = async () => {
    await getSupabase().functions.invoke('admin-backup-export', { body: { tables: ['user_payments', 'service_requests'] } });
  };

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={3} tall />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <EmptyState title="No analytics data" subtitle="Metrics will appear once activity is recorded" icon="📊" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Analytics</Text>
      <View style={styles.grid}>
        <KpiCard label="Total revenue (₹)" value={data.totalRevenue.toFixed(0)} />
        <KpiCard label="Avg resolution (hrs)" value={data.avgResolutionHours ?? 0} />
        <KpiCard label="Attendance rate (%)" value={data.attendanceRate ?? 0} />
      </View>
      <Text style={styles.section}>Reports</Text>
      <Text style={styles.desc}>Revenue, turnaround time, and officer attendance metrics.</Text>
      <Button label="Export CSV backup" variant="secondary" onPress={onExport} style={styles.btn} />
      <Button label="Refresh" variant="ghost" onPress={refetch} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  section: { fontWeight: '600', marginTop: 24, marginBottom: 4 },
  desc: { color: colors.textSecondary, marginBottom: 16 },
  btn: { marginBottom: 8 },
});
