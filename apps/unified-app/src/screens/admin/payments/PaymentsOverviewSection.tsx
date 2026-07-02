import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AdminButton, AdminKPICard, SectionCard } from '@/components/admin';
import { ExportButton, type PaymentFilterState } from '@/components/payments';
import { SkeletonLoader } from '@/components/common';
import { useCollectionDashboardKpis } from '@/hooks/usePayments';
import { CollectionActivityTicker } from '@/screens/admin/DashboardScreen/components/CollectionActivityTicker';
import type { AdminPaymentsStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { spacing } from '@/theme/spacing';
import { formatINR } from '@/utils/currencyFormat';

type Props = {
  filters: PaymentFilterState;
  pendingSum?: number;
  onFilterPendingReview: () => void;
};

export function PaymentsOverviewSection({ filters, pendingSum, onFilterPendingReview }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AdminPaymentsStackParamList>>();
  const { data: kpis, isLoading } = useCollectionDashboardKpis();

  const pendingAmountLabel =
    pendingSum != null ? formatINR(pendingSum) : '—';

  return (
    <View style={styles.section}>
      <SectionCard title="Payments overview">
        <View style={styles.actions}>
          <AdminButton
            label="Record payment"
            onPress={() => navigation.navigate('RecordPayment')}
          />
          <Pressable onPress={() => navigation.navigate('CollectionAssignments')}>
            <Text style={styles.link}>Assignments</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('GatewayConfig')}>
            <Text style={styles.link}>Gateways</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('PaymentAnalytics')}>
            <Text style={styles.link}>Analytics</Text>
          </Pressable>
          <ExportButton filters={filters} />
        </View>

        {isLoading || !kpis ? (
          <SkeletonLoader rows={2} rowHeight={72} shape="card" />
        ) : (
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCell}>
              <AdminKPICard label="Outstanding" value={formatINR(kpis.total_outstanding)} icon="💰" />
            </View>
            <View style={styles.kpiCell}>
              <AdminKPICard
                label="Collected today"
                value={formatINR(kpis.collected_today)}
                icon="✅"
                surface="teal"
                status="healthy"
              />
            </View>
            <Pressable style={styles.kpiCell} onPress={onFilterPendingReview}>
              <AdminKPICard
                label="Pending review"
                value={kpis.pending_review}
                icon="🔍"
                surface="blue"
                status={kpis.pending_review > 0 ? 'attention' : 'neutral'}
              />
            </Pressable>
            <Pressable
              style={styles.kpiCell}
              onPress={() => navigation.navigate('CollectionAssignments')}
            >
              <AdminKPICard
                label="Open pool"
                value={kpis.open_pool_count}
                icon="📋"
                status={kpis.open_pool_count > 0 ? 'attention' : 'neutral'}
              />
            </Pressable>
            <View style={styles.kpiCell}>
              <AdminKPICard
                label="Pending amount"
                value={pendingAmountLabel}
                icon="⏳"
                surface="amber"
                status={pendingSum != null && pendingSum > 0 ? 'attention' : 'neutral'}
              />
            </View>
          </View>
        )}
      </SectionCard>

      <CollectionActivityTicker />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
    color: adminColors.primary,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  kpiCell: {
    width: '48%',
    flexGrow: 1,
  },
});
