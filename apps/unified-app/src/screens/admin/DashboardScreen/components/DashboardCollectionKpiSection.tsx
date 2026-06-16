import { StyleSheet, View } from 'react-native';

import { AdminKPICard } from '@/components/admin';
import { useCollectionDashboardKpis } from '@/hooks/usePayments';
import { formatINR } from '@/utils/currencyFormat';
import { spacing } from '@/theme/spacing';

export function DashboardCollectionKpiSection() {
  const { data, isLoading } = useCollectionDashboardKpis();

  if (isLoading || !data) return null;

  return (
    <View style={styles.grid}>
      <AdminKPICard label="Outstanding" value={formatINR(data.total_outstanding)} icon="💰" />
      <AdminKPICard label="Collected today" value={formatINR(data.collected_today)} icon="✅" />
      <AdminKPICard label="Pending review" value={data.pending_review} icon="🔍" />
      <AdminKPICard label="Open pool" value={data.open_pool_count} icon="📋" />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
});
