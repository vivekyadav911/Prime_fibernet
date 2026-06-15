import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@prime/ui';

import { TicketCard, TicketFilterSheet } from '@/components/TicketPortal';
import { StatsCard } from '@/components/support';
import { AdminEmptyState, FilterChips, RoleGuard, SearchBar, SelectField } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { DEFAULT_TICKET_FILTERS, useTickets } from '@/hooks/useTickets';
import { useGetSupportDashboardStatsQuery } from '@/services/api/adminSupportApi';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminTicketsStackParamList } from '@/types/navigation';
import type { Ticket, TicketStatus } from '@/types/tickets';
import { exportTicketsBulkPDF } from '@/utils/ticketPdfExport';

type Props = NativeStackScreenProps<AdminTicketsStackParamList, 'TicketList'>;

const STATUS_TABS: { value: TicketStatus | 'All'; label: string }[] = [
  { value: 'All', label: 'All' },
  { value: 'Open', label: 'Open' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Awaiting Customer', label: 'Awaiting Customer' },
  { value: 'Awaiting Parts', label: 'Awaiting Parts' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Closed', label: 'Closed' },
  { value: 'Reopened', label: 'Reopened' },
];

const SORT_OPTIONS = [
  { value: 'newest' as const, label: 'Newest First' },
  { value: 'oldest' as const, label: 'Oldest First' },
  { value: 'priority_high' as const, label: 'Priority (High→Low)' },
  { value: 'sla_urgent' as const, label: 'SLA Urgent First' },
];

export function TicketListScreen({ navigation }: Props) {
  const {
    tickets,
    allTickets,
    filters,
    updateFilters,
    resetFilters,
    loading,
    refreshing,
    onRefresh,
    error,
  } = useTickets();
  const { data: stats } = useGetSupportDashboardStatsQuery();

  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.priority !== 'All') count += 1;
    if (filters.complaintType !== 'All') count += 1;
    if (filters.assignment !== 'all') count += 1;
    if (filters.slaBreached !== null) count += 1;
    if (filters.dateRange.from || filters.dateRange.to) count += 1;
    return count;
  }, [filters]);

  const handleExport = useCallback(async () => {
    if (tickets.length === 0) {
      Alert.alert('No tickets', 'No tickets match the current filters.');
      return;
    }
    setExporting(true);
    try {
      await exportTicketsBulkPDF(tickets, filters);
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Could not generate PDF.');
    } finally {
      setExporting(false);
    }
  }, [filters, tickets]);

  const renderItem = useCallback(
    ({ item }: { item: Ticket }) => (
      <TicketCard
        ticket={item}
        onPress={(t) => navigation.navigate('TicketDetail', { ticketId: t.id })}
      />
    ),
    [navigation],
  );

  if (loading && !refreshing) {
    return (
      <Screen>
        <SkeletonLoader rows={8} />
      </Screen>
    );
  }

  if (error && !allTickets.length) {
    return (
      <Screen>
        <ErrorState message={error} onRetry={onRefresh} />
      </Screen>
    );
  }

  return (
    <RoleGuard requiredPermission="requests.view">
      <Screen padded={false}>
        <View style={styles.header}>
          <Text style={styles.title}>All Tickets</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{tickets.length}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatsCard
            label="Open"
            value={stats?.openTickets ?? 0}
            onPress={() => updateFilters({ status: 'Open' })}
          />
          <StatsCard
            label="In Progress"
            value={stats?.inProgressTickets ?? 0}
            onPress={() => updateFilters({ status: 'In Progress' })}
          />
          <StatsCard label="SLA Breaches" value={stats?.slaBreaches ?? 0} tone="danger" onPress={() => updateFilters({ slaBreached: true })} />
        </View>

        <View style={styles.toolbar}>
          <SearchBar
            value={filters.searchQuery}
            onChangeText={(q) => updateFilters({ searchQuery: q })}
            placeholder="Search tickets…"
          />
          <View style={styles.controls}>
            <View style={styles.sortWrap}>
              <SelectField
                label=""
                value={filters.sortBy}
                options={SORT_OPTIONS}
                onSelect={(v) => updateFilters({ sortBy: v })}
              />
            </View>
            <Pressable style={styles.iconBtn} onPress={() => setFilterSheetVisible(true)}>
              <Ionicons name="filter" size={20} color={adminColors.primary} />
              {activeFilterCount > 0 ? (
                <View style={styles.filterCount}>
                  <Text style={styles.filterCountText}>{activeFilterCount}</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable style={styles.exportBtn} onPress={handleExport} disabled={exporting}>
              {exporting ? (
                <ActivityIndicator size="small" color={colors.surfaceWhite} />
              ) : (
                <>
                  <Ionicons name="download-outline" size={16} color={colors.surfaceWhite} />
                  <Text style={styles.exportText}>Export</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        <FilterChips
          options={STATUS_TABS.map((t) => ({ value: t.value, label: t.label }))}
          selected={filters.status}
          onSelect={(v) => updateFilters({ status: v as TicketStatus | 'All' })}
        />

        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <AdminEmptyState
              title="No tickets found"
              subtitle="Try adjusting your filters or create a new ticket."
              actionLabel="Clear filters"
              onAction={resetFilters}
            />
          }
        />

        <TicketFilterSheet
          visible={filterSheetVisible}
          filters={filters}
          onClose={() => setFilterSheetVisible(false)}
          onApply={(patch) => updateFilters(patch)}
          onClear={() => {
            resetFilters();
            setFilterSheetVisible(false);
          }}
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  countBadge: {
    backgroundColor: `${adminColors.primary}22`,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: adminColors.primary,
  },
  toolbar: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sortWrap: {
    flex: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: adminColors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    fontSize: 10,
    color: colors.surfaceWhite,
    fontWeight: '700',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: adminColors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    minHeight: 40,
  },
  exportText: {
    color: colors.surfaceWhite,
    fontWeight: '600',
    fontSize: 13,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
});
