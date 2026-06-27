import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AssignOfficerModal } from '@/components/Requests/AssignOfficerModal';
import { ExportRequestsModal } from '@/components/Requests/ExportRequestsModal';
import { RequestCard } from '@/components/Requests/RequestCard';
import { RequestDetailModal } from '@/screens/admin/requests/RequestDetailModal';
import { AdminScreenLayout, AdminEmptyState,
  AdminStateShell,
  FilterChips,
  RoleGuard,
  SearchBar,
  SelectField, } from '@/components/admin';
import { useAdminRequests } from '@/hooks/useAdminRequests';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { Officer, RequestSource, ServiceRequest } from '@/types/requests';

type MobileTab = 'unassigned' | 'assigned';

const SOURCE_FILTERS: { value: RequestSource | 'All'; label: string }[] = [
  { value: 'All', label: 'All' },
  { value: 'customer', label: 'Customer' },
  { value: 'admin', label: 'From admin' },
];

const SORT_OPTIONS = [
  { value: 'newest' as const, label: 'Newest First' },
  { value: 'oldest' as const, label: 'Oldest First' },
];

export function RequestsScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 600;
  const [mobileTab, setMobileTab] = useState<MobileTab>('unassigned');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [assignTarget, setAssignTarget] = useState<ServiceRequest | null>(null);
  const [exportVisible, setExportVisible] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const {
    allRequests,
    unassignedRequests,
    assignedRequests,
    filters,
    updateFilters,
    loading,
    error,
    refresh,
    assignOfficer,
    addNote,
  } = useAdminRequests();

  const selectedLive = useMemo(() => {
    if (!selectedRequest) return null;
    return allRequests.find((r) => r.id === selectedRequest.id) ?? selectedRequest;
  }, [allRequests, selectedRequest]);

  const handleAssign = useCallback(
    async (officer: Officer) => {
      if (!assignTarget) return;
      setAssigning(true);
      try {
        await assignOfficer(assignTarget.id, officer, !!assignTarget.assignedOfficerId);
        setAssignTarget(null);
      } finally {
        setAssigning(false);
      }
    },
    [assignOfficer, assignTarget],
  );

  const handleDetailAssign = useCallback(
    async (requestId: string, officer: Officer, isReassign: boolean) => {
      await assignOfficer(requestId, officer, isReassign);
    },
    [assignOfficer],
  );

  const renderColumn = useCallback(
    (title: string, data: ServiceRequest[], variant: 'unassigned' | 'assigned') => (
      <View style={isWide ? styles.column : styles.columnMobile}>
        <View style={styles.columnHeader}>
          <Text style={styles.columnTitle}>{title}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{data.length}</Text>
          </View>
        </View>
        {data.length === 0 ? (
          <AdminEmptyState title={`No ${variant} requests`} iconName="document-text-outline" />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <RequestCard
                request={item}
                variant={variant}
                onPress={() => setSelectedRequest(item)}
                onAssign={() => setAssignTarget(item)}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            style={styles.list}
          />
        )}
      </View>
    ),
    [isWide],
  );

  return (
    <RoleGuard requiredPermission="requests.view">
      <AdminStateShell
        isLoading={loading && !allRequests.length}
        isError={!!error && !allRequests.length}
        errorMessage={error ?? undefined}
        onRetry={() => void refresh()}
        loadingRows={8}
        loadingShape="card"
      >
      <AdminScreenLayout>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Requests</Text>
        </View>

        <View style={styles.toolbar}>
          <SearchBar
            value={filters.searchQuery}
            onChangeText={(searchQuery) => updateFilters({ searchQuery })}
            placeholder="Search by ID, customer or service type…"
            containerStyle={styles.searchBar}
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
            <Pressable style={styles.exportBtn} onPress={() => setExportVisible(true)}>
              <Ionicons name="download-outline" size={18} color={colors.surfaceWhite} />
              <Text style={styles.exportBtnText}>Export</Text>
            </Pressable>
          </View>
        </View>

        {isWide ? (
          <View style={styles.columnsRow}>
            {renderColumn('Unassigned Requests', unassignedRequests, 'unassigned')}
            {renderColumn('Assigned to Officers', assignedRequests, 'assigned')}
          </View>
        ) : (
          <>
            <View style={styles.tabRow}>
              <Pressable
                style={[styles.tab, mobileTab === 'unassigned' && styles.tabActive]}
                onPress={() => setMobileTab('unassigned')}
              >
                <Text style={[styles.tabText, mobileTab === 'unassigned' && styles.tabTextActive]}>
                  Unassigned ({unassignedRequests.length})
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tab, mobileTab === 'assigned' && styles.tabActive]}
                onPress={() => setMobileTab('assigned')}
              >
                <Text style={[styles.tabText, mobileTab === 'assigned' && styles.tabTextActive]}>
                  Assigned ({assignedRequests.length})
                </Text>
              </Pressable>
            </View>
            {mobileTab === 'unassigned'
              ? renderColumn('Unassigned Requests', unassignedRequests, 'unassigned')
              : renderColumn('Assigned to Officers', assignedRequests, 'assigned')}
          </>
        )}

        <RequestDetailModal
          visible={!!selectedRequest}
          request={selectedLive}
          onClose={() => setSelectedRequest(null)}
          onAssign={handleDetailAssign}
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
          requests={allRequests}
          onClose={() => setExportVisible(false)}
        />
      </AdminScreenLayout>
      </AdminStateShell>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  pageTitle: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  toolbar: { padding: spacing.md, gap: spacing.sm },
  searchBar: { flex: 0, width: '100%' },
  controlsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: spacing.sm },
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
  columnsRow: { flex: 1, flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.md, minHeight: 0 },
  column: { flex: 1, minWidth: 0, minHeight: 0 },
  columnMobile: { flex: 1, paddingHorizontal: spacing.md, minHeight: 0 },
  columnHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
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
    marginHorizontal: spacing.md,
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
