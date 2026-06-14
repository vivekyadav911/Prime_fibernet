import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@prime/ui';

import {
  AdminEmptyState,
  AdminKPICard,
  AvatarIcon,
  FilterChips,
  QuickAccessGrid,
  SearchBar,
  SectionCard,
  StatusBadge,
  type QuickAccessItem,
} from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import {
  useGetAllRequestsQuery,
  useGetDashboardKpisQuery,
  useGetRecentActivitiesQuery,
  useGetUpcomingRechargesQuery,
  useSendBulkRechargeNotificationMutation,
} from '@/store/api/endpoints';
import type { AdminDrawerParamList } from '@/types/navigation';
import type { RechargeFilter, RechargeSort } from '@/services/api/adminDashboardApi';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

const QUICK_ACCESS: QuickAccessItem[] = [
  { id: 'users', label: 'Users', icon: '👥', route: 'Users' },
  { id: 'officers', label: 'Officers', icon: '🛡️', route: 'Officers' },
  { id: 'requests', label: 'Requests', icon: '📋', route: 'Requests' },
  { id: 'payments', label: 'Payments', icon: '💳', route: 'Payments' },
  { id: 'plans', label: 'Plans', icon: '📶', route: 'Plans' },
  { id: 'notifications', label: 'Notifications', icon: '🔔', route: 'Notifications' },
  { id: 'reports', label: 'Reports', icon: '📊', route: 'Reports' },
  { id: 'settings', label: 'Settings', icon: '⚙️', route: 'Settings' },
];

const FILTER_OPTIONS: { value: RechargeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'under_7', label: 'Under 7 Days' },
  { value: 'under_14', label: 'Under 14 Days' },
];

function daysBadgeColor(days: number): string {
  if (days < 3) return adminColors.badgeDanger;
  if (days < 7) return adminColors.badgePending;
  if (days < 14) return adminColors.badgeWarning;
  return adminColors.badgeActive;
}

export function DashboardScreen() {
  const navigation = useNavigation<DrawerNavigationProp<AdminDrawerParamList>>();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RechargeFilter>('all');
  const [sort, setSort] = useState<RechargeSort>('expiry_asc');

  const { data: kpis, isLoading: kpisLoading } = useGetDashboardKpisQuery();
  const { data: recharges, isLoading: rechargeLoading, error: rechargeError, refetch } = useGetUpcomingRechargesQuery({
    filter,
    search,
    sort,
  });
  const { data: activities } = useGetRecentActivitiesQuery({ page: 1, limit: 20 });
  const { data: allRequests } = useGetAllRequestsQuery();
  const [sendBulk] = useSendBulkRechargeNotificationMutation();

  const requestSummary = useMemo(() => {
    const open = (allRequests ?? []).filter((r) =>
      ['pending', 'assigned', 'in_transit', 'on_site', 'working'].includes(r.status),
    );
    const unassigned = open.filter((r) => !r.officerId);
    return { pending: open.length, unassigned: unassigned.length };
  }, [allRequests]);

  const toggleSort = useCallback(() => {
    setSort((s) => (s === 'expiry_asc' ? 'expiry_desc' : 'expiry_asc'));
  }, []);

  const handleBulkNotify = useCallback(async () => {
    const ids = (recharges ?? []).map((r) => r.id);
    if (!ids.length) return;
    try {
      await sendBulk({
        userIds: ids,
        title: 'Plan renewal reminder',
        body: 'Your internet plan is expiring soon. Please recharge to avoid interruption.',
      }).unwrap();
      Alert.alert('Sent', 'Bulk notification queued for displayed users.');
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not send notifications');
    }
  }, [recharges, sendBulk]);

  const handleQuickAccess = useCallback(
    (route: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigation.navigate(route as any);
    },
    [navigation],
  );

  if (kpisLoading || rechargeLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={8} shape="card" />
      </Screen>
    );
  }

  if (rechargeError) {
    return (
      <Screen>
        <ErrorState message={queryErrorMessage(rechargeError)} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.canvas}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Dashboard</Text>

        <View style={styles.kpiRow}>
          <AdminKPICard label="Active subscribers" value={kpis?.activeSubscribers ?? 0} icon="👥" />
          <AdminKPICard label="MRR (₹)" value={kpis?.mrr ?? 0} icon="💰" />
          <AdminKPICard label="Open requests" value={kpis?.openRequests ?? 0} icon="📋" />
          <AdminKPICard label="Officers online" value={kpis?.officersOnline ?? 0} icon="🛡️" />
        </View>

        <SectionCard title="Quick Access">
          <QuickAccessGrid items={QUICK_ACCESS} onPress={handleQuickAccess} />
        </SectionCard>

        <SectionCard title="Requests Summary">
          <View style={styles.requestsSummaryRow}>
            <View style={styles.requestsStat}>
              <Text style={styles.requestsStatValue}>{requestSummary.pending}</Text>
              <Text style={styles.requestsStatLabel}>Pending requests</Text>
            </View>
            <View style={styles.requestsStat}>
              <Text style={[styles.requestsStatValue, styles.requestsStatWarning]}>
                {requestSummary.unassigned}
              </Text>
              <Text style={styles.requestsStatLabel}>Unassigned</Text>
            </View>
          </View>
          <Pressable onPress={() => navigation.navigate('Requests')} style={styles.viewAllLink}>
            <Text style={styles.viewAllText}>View All</Text>
          </Pressable>
        </SectionCard>

        <SectionCard
          title="Upcoming Recharges"
          actionLabel="Send Notification"
          onAction={() => void handleBulkNotify()}
        >
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, email, phone, city…" />
          <FilterChips options={FILTER_OPTIONS} selected={filter} onSelect={setFilter} />
          <Pressable onPress={toggleSort} style={styles.sortBtn}>
            <Text style={styles.sortText}>Sort: Expiry {sort === 'expiry_asc' ? '↑' : '↓'}</Text>
          </Pressable>
          {!recharges?.length ? (
            <AdminEmptyState title="No upcoming recharges" icon="✅" />
          ) : (
            recharges.map((item) => (
              <View key={item.id} style={styles.rechargeCard}>
                <AvatarIcon name={item.customerName} />
                <View style={styles.rechargeInfo}>
                  <Text style={styles.rechargeName}>{item.customerName}</Text>
                  <Text style={styles.rechargeMeta}>
                    {item.planName} · ₹{item.price} · {item.phone} · {item.city}
                  </Text>
                  <Text style={styles.rechargeExpiry}>Expires {new Date(item.expiryDate).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.daysBadge, { backgroundColor: daysBadgeColor(item.daysRemaining) }]}>
                  <Text style={styles.daysText}>{item.daysRemaining}d</Text>
                </View>
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard title="Recent Activities">
          {!activities?.length ? (
            <AdminEmptyState title="No recent activity" icon="📭" />
          ) : (
            <FlatList
              data={activities}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.activityRow}>
                  <Text style={styles.activityIcon}>{item.icon}</Text>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>{item.title}</Text>
                    <Text style={styles.activityDesc}>{item.description}</Text>
                    <Text style={styles.activityTime}>{new Date(item.timestamp).toLocaleString()}</Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>
              )}
            />
          )}
        </SectionCard>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  canvas: { backgroundColor: adminColors.canvasBg },
  title: { fontSize: 24, fontWeight: '700', marginBottom: spacing.md, color: colors.textPrimary },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  requestsSummaryRow: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.sm },
  requestsStat: { flex: 1 },
  requestsStatValue: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  requestsStatWarning: { color: adminColors.badgePending },
  requestsStatLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  viewAllLink: { alignSelf: 'flex-start' },
  viewAllText: { fontSize: 14, fontWeight: '600', color: adminColors.primary },
  sortBtn: { alignSelf: 'flex-end', marginVertical: spacing.xs },
  sortText: { color: adminColors.primary, fontWeight: '600', fontSize: 12 },
  rechargeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  rechargeInfo: { flex: 1 },
  rechargeName: { fontWeight: '600', color: colors.textPrimary },
  rechargeMeta: { fontSize: 12, color: colors.textSecondary },
  rechargeExpiry: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  daysBadge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  daysText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  activityIcon: { fontSize: 20 },
  activityInfo: { flex: 1 },
  activityTitle: { fontWeight: '600', color: colors.textPrimary },
  activityDesc: { fontSize: 12, color: colors.textSecondary },
  activityTime: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
});
