import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AssignOfficerModal } from '@/components/Requests/AssignOfficerModal';
import { ExportRequestsModal } from '@/components/Requests/ExportRequestsModal';
import { PortalTicketCard } from '@/components/TicketPortal/PortalTicketCard';
import { AdminEmptyState, FilterChips, SearchBar, SelectField } from '@/components/admin';
import { useTicketPortal } from '@/hooks/useTicketPortal';
import { useTicketPortalStats } from '@/hooks/useTicketPortalStats';
import { RequestDetailModal } from '@/screens/admin/requests/RequestDetailModal';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminTicketsStackParamList } from '@/types/navigation';
import type { PortalItemSource, PortalStatusBucket, PortalTicketItem } from '@/types/portalTicket';
import type { Officer, ServiceRequest } from '@/types/requests';
import { exportTicketsBulkPDF } from '@/utils/ticketPdfExport';

type Props = {
  navigation: NativeStackNavigationProp<AdminTicketsStackParamList>;
  initialStatus?: PortalStatusBucket;
};

type MobileAssignmentTab = 'unassigned' | 'assigned';

const STATUS_TABS: { value: PortalStatusBucket | 'All'; label: string }[] = [
  { value: 'All', label: 'All' },
  { value: 'Open', label: 'Open' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Awaiting Customer', label: 'Awaiting Customer' },
  { value: 'Awaiting Parts', label: 'Awaiting Parts' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Closed', label: 'Closed' },
  { value: 'Reopened', label: 'Reopened' },
];

const SOURCE_FILTERS: { value: PortalItemSource | 'All'; label: string }[] = [
  { value: 'All', label: 'All' },
  { value: 'customer', label: 'Customer' },
  { value: 'officer', label: 'Officer' },
  { value: 'admin', label: 'Admin' },
];

const SORT_OPTIONS = [
  { value: 'newest' as const, label: 'Newest First' },
  { value: 'oldest' as const, label: 'Oldest First' },
  { value: 'priority_high' as const, label: 'Priority (High→Low)' },
  { value: 'sla_urgent' as const, label: 'SLA Urgent First' },
];

export function TicketPortalAllTicketsTab({ navigation, initialStatus }: Props) {
  const { width } = useWindowDimensions();
  const isWide = width >= 600;
  const { stats } = useTicketPortalStats();
  const {
    filteredItems,
    unassignedItems,
    assignedItems,
    filters,
    viewMode,
    setViewMode,
    updateFilters,
    resetFilters,
    assignOfficer,
    addNote,
    refreshing,
    onRefresh,
  } = useTicketPortal();

  const [mobileTab, setMobileTab] = useState<MobileAssignmentTab>('unassigned');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [assignTarget, setAssignTarget] = useState<PortalTicketItem | null>(null);
  const [exportVisible, setExportVisible] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (initialStatus) {
      updateFilters({ status: initialStatus });
    }
  }, [initialStatus, updateFilters]);

  const exportRequests = useMemo(
    () =>
      filteredItems
        .filter((i) => i.request)
        .map((i) => i.request!)
        .filter(Boolean),
    [filteredItems],
  );

  const exportTickets = useMemo(
    () =>
      filteredItems
        .filter((i) => i.ticket)
        .map((i) => i.ticket!)
        .filter(Boolean),
    [filteredItems],
  );

  const openItem = useCallback(
    (item: PortalTicketItem) => {
      if (item.ticketId) {
        navigation.navigate('TicketDetail', { ticketId: item.ticketId });
        return;
      }
      if (item.request) {
        setSelectedRequest(item.request);
      }
    },
    [navigation],
  );

  const handleAssign = useCallback(
    async (officer: Officer) => {
      if (!assignTarget) return;
      setAssigning(true);
      try {
        await assignOfficer(
          assignTarget.id,
          officer,
          Boolean(assignTarget.assignedOfficerId),
        );
        setAssignTarget(null);
      } finally {
        setAssigning(false);
      }
    },
    [assignOfficer, assignTarget],
  );

  const handleExport = useCallback(async () => {
    if (exportTickets.length === 0 && exportRequests.length === 0) {
      Alert.alert('Nothing to export', 'No tickets match the current filters.');
      return;
    }
    setExporting(true);
    try {
      if (exportTickets.length > 0) {
        await exportTicketsBulkPDF(exportTickets, {
          status: 'All',
          priority: 'All',
          complaintType: 'All',
          assignment: filters.assignment,
          slaBreached: filters.slaBreached,
          dateRange: { from: null, to: null },
          sortBy: filters.sortBy === 'priority_high' || filters.sortBy === 'sla_urgent' ? 'newest' : filters.sortBy,
          searchQuery: filters.searchQuery,
        });
      }
      if (exportRequests.length > 0) {
        setExportVisible(true);
      }
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Could not export.');
    } finally {
      setExporting(false);
    }
  }, [exportRequests.length, exportTickets, filters]);

  const renderItem = useCallback(
    ({ item }: { item: PortalTicketItem }) => (
      <PortalTicketCard
        item={item}
        variant={item.assignedOfficerId ? 'assigned' : 'unassigned'}
        onPress={() => openItem(item)}
        onAssign={!item.assignedOfficerId ? () => setAssignTarget(item) : undefined}
      />
    ),
    [openItem],
  );

  const renderColumn = useCallback(
    (title: string, data: PortalTicketItem[], variant: 'unassigned' | 'assigned') => (
      <View style={isWide ? styles.column : styles.columnMobile}>
        <View style={styles.columnHeader}>
          <Text style={styles.columnTitle}>{title}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{data.length}</Text>
          </View>
        </View>
        {data.length === 0 ? (
          <AdminEmptyState
            title={variant === 'unassigned' ? 'No unassigned tickets' : 'No assigned tickets'}
            subtitle={
              variant === 'unassigned'
                ? 'Nice work — the queue is clear.'
                : 'Assign officers from the unassigned column.'
            }
            iconName="ticket-outline"
          />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            style={styles.list}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        )}
      </View>
    ),
    [isWide, onRefresh, refreshing, renderItem],
  );

  const listHeader = (
    <View style={styles.headerBlock}>
      <View style={styles.statsHint}>
        <Text style={styles.statsHintText}>
          {stats.totalOpen} open · {stats.slaBreaches} breached · {stats.unassigned} unassigned
        </Text>
      </View>

      <View style={styles.viewModeRow}>
        <Pressable
          style={[styles.viewModeBtn, viewMode === 'assignment' && styles.viewModeBtnActive]}
          onPress={() => setViewMode('assignment')}
        >
          <Text style={[styles.viewModeText, viewMode === 'assignment' && styles.viewModeTextActive]}>
            By assignment
          </Text>
        </Pressable>
        <Pressable
          style={[styles.viewModeBtn, viewMode === 'status' && styles.viewModeBtnActive]}
          onPress={() => setViewMode('status')}
        >
          <Text style={[styles.viewModeText, viewMode === 'status' && styles.viewModeTextActive]}>
            By status
          </Text>
        </Pressable>
      </View>

      <SearchBar
        value={filters.searchQuery}
        onChangeText={(searchQuery) => updateFilters({ searchQuery })}
        placeholder="Search by ID, customer, or service type…"
      />

      <View style={styles.controlsRow}>
        <View style={styles.sortWrap}>
          <SelectField
            label="SORT BY"
            value={filters.sortBy}
            options={SORT_OPTIONS}
            onSelect={(sortBy) => updateFilters({ sortBy })}
          />
        </View>
        <FilterChips
          options={SOURCE_FILTERS}
          selected={filters.source}
          onSelect={(source) => updateFilters({ source })}
        />
        <Pressable style={styles.exportBtn} onPress={handleExport} disabled={exporting}>
          {exporting ? (
            <ActivityIndicator size="small" color={colors.surfaceWhite} />
          ) : (
            <>
              <Ionicons name="download-outline" size={18} color={colors.surfaceWhite} />
              <Text style={styles.exportBtnText}>Export</Text>
            </>
          )}
        </Pressable>
      </View>

      {viewMode === 'status' ? (
        <FilterChips
          options={STATUS_TABS}
          selected={filters.status}
          onSelect={(status) => updateFilters({ status })}
        />
      ) : null}
    </View>
  );

  return (
    <View style={styles.root}>
      {viewMode === 'assignment' ? (
        <>
          {listHeader}
          {isWide ? (
            <View style={styles.columnsRow}>
              {renderColumn('Unassigned', unassignedItems, 'unassigned')}
              {renderColumn('Assigned to Officers', assignedItems, 'assigned')}
            </View>
          ) : (
            <>
              <View style={styles.tabRow}>
                <Pressable
                  style={[styles.tab, mobileTab === 'unassigned' && styles.tabActive]}
                  onPress={() => setMobileTab('unassigned')}
                >
                  <Text style={[styles.tabText, mobileTab === 'unassigned' && styles.tabTextActive]}>
                    Unassigned ({unassignedItems.length})
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.tab, mobileTab === 'assigned' && styles.tabActive]}
                  onPress={() => setMobileTab('assigned')}
                >
                  <Text style={[styles.tabText, mobileTab === 'assigned' && styles.tabTextActive]}>
                    Assigned ({assignedItems.length})
                  </Text>
                </Pressable>
              </View>
              {mobileTab === 'unassigned'
                ? renderColumn('Unassigned', unassignedItems, 'unassigned')
                : renderColumn('Assigned to Officers', assignedItems, 'assigned')}
            </>
          )}
        </>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <AdminEmptyState
              title="No tickets found"
              subtitle="Try adjusting filters or create a new ticket."
              iconName="ticket-outline"
              actionLabel="Clear filters"
              onAction={resetFilters}
            />
          }
        />
      )}

      <RequestDetailModal
        visible={!!selectedRequest}
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onAssign={async (requestId, officer, isReassign) => {
          const item = filteredItems.find((i) => i.requestId === requestId);
          if (item) {
            await assignOfficer(item.id, officer, isReassign);
          }
        }}
        onAddNote={addNote}
      />

      <AssignOfficerModal
        visible={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        onSelect={handleAssign}
        loading={assigning}
      />

      <ExportRequestsModal
        visible={exportVisible}
        requests={exportRequests}
        onClose={() => setExportVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBlock: { gap: spacing.sm, paddingBottom: spacing.sm },
  statsHint: { paddingHorizontal: spacing.xs },
  statsHintText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  viewModeRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceWhite,
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  viewModeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 6,
  },
  viewModeBtnActive: { backgroundColor: adminColors.primaryTint },
  viewModeText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  viewModeTextActive: { color: adminColors.primary },
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  sortWrap: { minWidth: 160, flexGrow: 1 },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: adminColors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    minHeight: 44,
  },
  exportBtnText: { color: colors.surfaceWhite, fontWeight: '700', fontSize: 14 },
  columnsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 0,
  },
  column: { flex: 1, minWidth: 0, minHeight: 0 },
  columnMobile: { flex: 1, minHeight: 0 },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  columnTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  countBadge: {
    backgroundColor: colors.borderDefault,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  countText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { paddingBottom: spacing.xxl },
  tabRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    borderRadius: 8,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: adminColors.primaryTint },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: adminColors.primary },
});
