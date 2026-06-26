import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';


import { AdminScreenLayout, QuickAccessGrid, type QuickAccessItem } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useNotificationsDashboardStats } from '@/hooks/useNotificationHub';
import { usePlansDashboardStats } from '@/hooks/usePlans';
import { useTickets } from '@/hooks/useTickets';
import {
  useGetAllRequestsQuery,
  useGetDashboardKpisQuery,
  useGetRecentActivitiesQuery,
  useGetRevenueByMonthQuery,
  useGetUpcomingRechargesQuery,
  useSendBulkRechargeNotificationMutation,
} from '@/store/api/endpoints';
import type { AdminDrawerParamList } from '@/types/navigation';
import type { RechargeFilter, RechargeSort } from '@/services/api/adminDashboardApi';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { queryErrorMessage } from '@/utils/queryError';

import { DashboardOpsSummary } from './components/DashboardOpsSummary';
import { DashboardQuickActions } from './components/DashboardQuickActions';
import { KpiStrip } from './components/KpiStrip';
import { PrimaryOperationsCard } from './components/PrimaryOperationsCard';
import { RecentActivitiesSection } from './components/RecentActivitiesSection';
import { UpcomingRechargesSection } from './components/UpcomingRechargesSection';
import { AccordionRow, SectionEyebrow } from './components/ui/DashboardPrimitives';
import { dash } from './dashboardUi';

const QUICK_ACCESS_BASE: Omit<QuickAccessItem, 'badge' | 'badgeTone' | 'alertDot'>[] = [
  { id: 'requests', label: 'Requests', icon: 'document-text-outline', route: 'Requests', surface: 'amber', priority: 'primary' },
  { id: 'users', label: 'Users', icon: 'people-outline', route: 'Users', surface: 'blue', priority: 'primary' },
  { id: 'payments', label: 'Payments', icon: 'card-outline', route: 'Payments', surface: 'purple', priority: 'primary' },
  { id: 'officers', label: 'Officers', icon: 'shield-checkmark-outline', route: 'Officers', surface: 'teal', priority: 'primary' },
  { id: 'plans', label: 'Plans', icon: 'wifi-outline', route: 'Plans', surface: 'blue', priority: 'secondary' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications-outline', route: 'Notifications', surface: 'amber', priority: 'secondary' },
  { id: 'reports', label: 'Reports', icon: 'bar-chart-outline', route: 'Reports', surface: 'teal', priority: 'secondary' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline', route: 'Settings', surface: 'neutral', priority: 'secondary' },
];

const URGENT_RENEWAL_DAYS = 7;

export function DashboardScreen() {
  const navigation = useNavigation<DrawerNavigationProp<AdminDrawerParamList>>();
  const scrollRef = useRef<ScrollView>(null);
  const rechargeSectionY = useRef(0);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RechargeFilter>('all');
  const [sort, setSort] = useState<RechargeSort>('expiry_asc');

  const { data: kpis, isLoading: kpisLoading } = useGetDashboardKpisQuery();
  const { data: allRecharges } = useGetUpcomingRechargesQuery({ filter: 'all', sort: 'expiry_asc' });
  const { data: recharges, isLoading: rechargeLoading, error: rechargeError, refetch } = useGetUpcomingRechargesQuery({
    filter,
    search,
    sort,
  });
  const { data: revenueSeries } = useGetRevenueByMonthQuery({});
  const { data: activities } = useGetRecentActivitiesQuery({ page: 1, limit: 20 });
  const { data: allRequests } = useGetAllRequestsQuery();
  const { openCount, breachedCount, unassignedCount: unassignedTickets, allTickets } = useTickets();
  const { stats: planStats } = usePlansDashboardStats();
  const { stats: notificationStats } = useNotificationsDashboardStats();
  const [sendBulk] = useSendBulkRechargeNotificationMutation();

  const ticketSummary = useMemo(() => {
    const inProgress = allTickets.filter((t) => t.status === 'In Progress').length;
    const resolved = allTickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;
    return { open: openCount, inProgress, resolved, breached: breachedCount, unassigned: unassignedTickets };
  }, [allTickets, breachedCount, openCount, unassignedTickets]);

  const requestSummary = useMemo(() => {
    const open = (allRequests ?? []).filter((r) =>
      ['pending', 'assigned', 'in_transit', 'on_site', 'working'].includes(r.status),
    );
    const unassigned = open.filter((r) => !r.officerId);
    return { pending: open.length, unassigned: unassigned.length };
  }, [allRequests]);

  const renewalsDueToday = useMemo(
    () => (allRecharges ?? []).filter((r) => r.daysRemaining <= 0).length,
    [allRecharges],
  );

  const urgentRenewals = useMemo(
    () => (allRecharges ?? []).filter((r) => r.daysRemaining <= URGENT_RENEWAL_DAYS),
    [allRecharges],
  );

  const revenueTrendPercent = useMemo(() => {
    if (!revenueSeries || revenueSeries.length < 2) return undefined;
    const current = revenueSeries[revenueSeries.length - 1]?.revenue ?? 0;
    const previous = revenueSeries[revenueSeries.length - 2]?.revenue ?? 0;
    if (previous <= 0) return undefined;
    return Math.round(((current - previous) / previous) * 100);
  }, [revenueSeries]);

  const scrollToRecharges = useCallback(() => {
    scrollRef.current?.scrollTo({ y: Math.max(rechargeSectionY.current - dash.pagePad, 0), animated: true });
  }, []);

  const focusRenewalsToday = useCallback(() => {
    setFilter('today');
    setSearch('');
    requestAnimationFrame(() => scrollToRecharges());
  }, [scrollToRecharges]);

  const focusUrgentRenewals = useCallback(() => {
    setFilter('under_7');
    setSearch('');
    requestAnimationFrame(() => scrollToRecharges());
  }, [scrollToRecharges]);

  const heroCopy = useMemo(() => {
    if (requestSummary.unassigned > 0) {
      return {
        headline: `${requestSummary.unassigned} request${requestSummary.unassigned === 1 ? '' : 's'} need assignment`,
        subline: 'Field work is waiting for an officer',
        onPress: () => navigation.navigate('Requests'),
      };
    }
    if (renewalsDueToday > 0) {
      return {
        headline: `${renewalsDueToday} renewal${renewalsDueToday === 1 ? '' : 's'} due today`,
        subline: 'Prevent service interruption for active customers',
        onPress: focusRenewalsToday,
      };
    }
    if (ticketSummary.breached > 0) {
      return {
        headline: `${ticketSummary.breached} ticket${ticketSummary.breached === 1 ? '' : 's'} breached SLA`,
        subline: 'Response targets need immediate action',
        onPress: () => navigation.navigate('TicketPortal', { screen: 'TicketList' }),
      };
    }
    if (urgentRenewals.length > 0) {
      return {
        headline: `${urgentRenewals.length} account${urgentRenewals.length === 1 ? '' : 's'} need follow-up`,
        subline: 'Renewals expiring within 7 days',
        onPress: focusUrgentRenewals,
      };
    }
    if (ticketSummary.open > 0) {
      return {
        headline: `${ticketSummary.open} ticket${ticketSummary.open === 1 ? '' : 's'} need review`,
        subline: 'Customer support queue needs attention',
        onPress: () => navigation.navigate('TicketPortal', { screen: 'TicketList' }),
      };
    }
    return {
      headline: 'Network is operating normally',
      subline: 'No urgent actions — monitor renewals and requests',
      onPress: scrollToRecharges,
    };
  }, [
    focusRenewalsToday,
    focusUrgentRenewals,
    navigation,
    renewalsDueToday,
    requestSummary.unassigned,
    scrollToRecharges,
    ticketSummary.breached,
    ticketSummary.open,
    urgentRenewals.length,
  ]);

  const shortcutItems = useMemo<QuickAccessItem[]>(() => {
    const badges: Record<string, Pick<QuickAccessItem, 'badge' | 'badgeTone' | 'alertDot'>> = {
      requests:
        requestSummary.unassigned > 0
          ? { badge: requestSummary.unassigned, badgeTone: 'warning' }
          : requestSummary.pending > 0
            ? { badge: requestSummary.pending, badgeTone: 'info' }
            : {},
      users: urgentRenewals.length > 0 ? { badge: urgentRenewals.length, badgeTone: 'warning' } : {},
      officers: (kpis?.officersOnline ?? 0) === 0 ? { alertDot: true, badgeTone: 'danger' } : {},
      notifications:
        (notificationStats?.totalDrafts ?? 0) > 0
          ? { badge: notificationStats?.totalDrafts ?? 0, badgeTone: 'warning' as const }
          : urgentRenewals.length > 0
            ? { alertDot: true, badgeTone: 'warning' as const }
            : {},
    };

    return QUICK_ACCESS_BASE.map((item) => ({
      ...item,
      ...badges[item.id],
    }));
  }, [
    kpis?.officersOnline,
    notificationStats?.totalDrafts,
    requestSummary.pending,
    requestSummary.unassigned,
    urgentRenewals.length,
  ]);

  const primaryShortcuts = useMemo(
    () => shortcutItems.filter((item) => item.priority === 'primary'),
    [shortcutItems],
  );

  const secondaryShortcuts = useMemo(
    () => shortcutItems.filter((item) => item.priority !== 'primary'),
    [shortcutItems],
  );

  const moreToolsSummary = useMemo(
    () => secondaryShortcuts.map((s) => s.label).join(', '),
    [secondaryShortcuts],
  );

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
      if (route === 'Payments') {
        navigation.navigate('Payments', { screen: 'PaymentList' });
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigation.navigate(route as any);
    },
    [navigation],
  );

  if (kpisLoading || rechargeLoading) {
    return (
      <AdminScreenLayout>
        <SkeletonLoader rows={8} shape="card" />
      </AdminScreenLayout>
    );
  }

  if (rechargeError) {
    return (
      <AdminScreenLayout>
        <ErrorState message={queryErrorMessage(rechargeError)} onRetry={refetch} />
      </AdminScreenLayout>
    );
  }

  return (
    <AdminScreenLayout>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <PrimaryOperationsCard
          headline={heroCopy.headline}
          subline={heroCopy.subline}
          onPress={heroCopy.onPress}
          mrr={kpis?.mrr ?? 0}
          subscribers={kpis?.activeSubscribers ?? 0}
          openRequests={kpis?.openRequests ?? 0}
          revenueTrendPercent={revenueTrendPercent}
        />

        <KpiStrip
          activeSubscribers={kpis?.activeSubscribers ?? 0}
          mrr={kpis?.mrr ?? 0}
          openRequests={kpis?.openRequests ?? 0}
          officersOnline={kpis?.officersOnline ?? 0}
          revenueTrendPercent={revenueTrendPercent}
        />

        <DashboardQuickActions items={primaryShortcuts} onPress={handleQuickAccess} />

        <View
          onLayout={(e) => {
            rechargeSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <UpcomingRechargesSection
            search={search}
            onSearchChange={setSearch}
            filter={filter}
            onFilterChange={setFilter}
            sort={sort}
            onToggleSort={toggleSort}
            recharges={recharges}
            onBulkNotify={() => void handleBulkNotify()}
          />
        </View>

        <View>
          <SectionEyebrow title="Operations Snapshot" />
          <DashboardOpsSummary
            requestSummary={requestSummary}
            planStats={planStats}
            ticketSummary={ticketSummary}
            navigation={navigation}
          />
        </View>

        <AccordionRow title="More tools" summary={moreToolsSummary}>
          <QuickAccessGrid items={secondaryShortcuts} onPress={handleQuickAccess} />
        </AccordionRow>

        <AccordionRow
          title="Activity log"
          summary={activities?.length ? `${activities.length} recent events` : 'No recent events'}
        >
          <RecentActivitiesSection activities={activities} />
        </AccordionRow>
      </ScrollView>
    </AdminScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: dash.pagePad,
    paddingTop: 12,
    paddingBottom: 24,
    gap: dash.sectionGap,
  },
});
