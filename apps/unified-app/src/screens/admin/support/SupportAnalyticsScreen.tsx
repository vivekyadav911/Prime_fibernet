import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, Button } from '@prime/ui';

import { StatsCard, SupportStatsRow } from '@/components/support';
import { FilterChips, RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useSupportAnalytics } from '@/hooks/useSupportAnalytics';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminSupportStackParamList } from '@/types/navigation';
import type { SupportAnalyticsPeriod } from '@/types/support';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminSupportStackParamList, 'SupportAnalytics'>;

const PERIOD_OPTIONS: { value: SupportAnalyticsPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

export function SupportAnalyticsScreen({}: Props) {
  const { data, period, setPeriod, isLoading, isError, error, refetch } = useSupportAnalytics('week');

  const handleExport = useCallback(async () => {
    if (!data) return;
    const csv = [
      'Metric,Value',
      ...Object.entries(data.byStatus).map(([k, v]) => `Status ${k},${v}`),
      ...Object.entries(data.byCategory).map(([k, v]) => `Category ${k},${v}`),
    ].join('\n');
    const path = `${FileSystem.cacheDirectory}support-report.csv`;
    await FileSystem.writeAsStringAsync(path, csv);
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path);
  }, [data]);

  if (isLoading) return <Screen><SkeletonLoader rows={8} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  const statusPie = Object.entries(data?.byStatus ?? {}).map(([label, value], i) => ({
    value,
    text: label,
    color: [adminColors.primary, adminColors.badgeActive, adminColors.badgeWarning, adminColors.badgeDanger][i % 4],
  }));

  const categoryBar = Object.entries(data?.byCategory ?? {}).slice(0, 6).map(([label, value]) => ({
    value,
    label: label.slice(0, 8),
    frontColor: adminColors.primary,
  }));

  const totalTickets = Object.values(data?.byStatus ?? {}).reduce((a, b) => a + b, 0);

  return (
    <RoleGuard requiredPermission="settings.view">
      <Screen style={adminScreenStyles.canvas} safeAreaTop={false}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <FilterChips options={PERIOD_OPTIONS} selected={period} onSelect={(v) => setPeriod(v as SupportAnalyticsPeriod)} />

          <SupportStatsRow>
            <StatsCard label="Total Tickets" value={totalTickets} />
            <StatsCard label="Categories" value={Object.keys(data?.byCategory ?? {}).length} />
          </SupportStatsRow>

          {statusPie.length > 0 ? (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Tickets by Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <PieChart data={statusPie} radius={90} showText />
              </ScrollView>
            </View>
          ) : null}

          {categoryBar.length > 0 ? (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Tickets by Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
                <BarChart data={categoryBar} barWidth={28} spacing={16} roundedTop />
              </ScrollView>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Agent Leaderboard</Text>
          {(data?.agentLeaderboard ?? []).map((a) => (
            <View key={a.agentId} style={styles.leaderRow}>
              <Text style={styles.agentName}>{a.agentName}</Text>
              <Text style={styles.agentMeta}>{a.resolved} resolved · {a.avgResolutionHours.toFixed(1)}h avg</Text>
            </View>
          ))}

          <Button label="Export Report (.csv)" onPress={() => void handleExport()} style={styles.exportBtn} />
        </ScrollView>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  chartCard: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: 12,
    padding: spacing.md,
    overflow: 'hidden',
  },
  chartScroll: { paddingVertical: spacing.sm },
  chartTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  leaderRow: { backgroundColor: colors.surfaceWhite, padding: spacing.md, borderRadius: 8, marginBottom: spacing.sm },
  agentName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  agentMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  exportBtn: { marginTop: spacing.lg },
});
