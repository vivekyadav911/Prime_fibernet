import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AdminButton, AdminEmptyState, AdminScreenLayout, Pagination, RoleGuard, SearchBar, SelectField } from '@/components/admin';
import {
  CollectionAssignmentsFilterSheet,
  CollectionStatusBadge,
  countActiveCollectionFilters,
} from '@/components/payments';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useCollectionAssignmentsSync } from '@/hooks/admin/useCollectionAssignmentsSync';
import { useGetOfficersQuery } from '@/services/api/officersApi';
import {
  useAssignCollectionOfficerMutation,
  useBulkAssignCollectionOfficerMutation,
  useGetCollectionAssignmentsQuery,
  useReleaseCollectionClaimMutation,
} from '@/services/api/collectionAssignmentsApi';
import type { CollectionAssignmentRow, CollectionSortKey } from '@/types/api/admin';
import {
  DEFAULT_COLLECTION_ASSIGNMENTS_FILTERS,
  parseCollectionSortKey,
  type CollectionAssignmentsFilters,
} from '@/types/api/admin';
import type { AdminPaymentsStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { pageLayout } from '@/theme/pageLayout';
import { radius, spacing } from '@/theme/spacing';
import { formatINR } from '@/utils/currencyFormat';
import { queryErrorMessage } from '@/utils/queryError';

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

const SORT_OPTIONS: { value: CollectionSortKey; label: string }[] = [
  { value: 'due_date_asc', label: 'Due date (soonest)' },
  { value: 'due_date_desc', label: 'Due date (latest)' },
  { value: 'name_asc', label: 'Name (A–Z)' },
  { value: 'name_desc', label: 'Name (Z–A)' },
  { value: 'outstanding_desc', label: 'Outstanding (high–low)' },
  { value: 'outstanding_asc', label: 'Outstanding (low–high)' },
  { value: 'collection_status_asc', label: 'Collection status (A–Z)' },
  { value: 'collection_status_desc', label: 'Collection status (Z–A)' },
];

export function CollectionAssignmentsScreen() {
  useCollectionAssignmentsSync();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AdminPaymentsStackParamList>>();
  const listRef = useRef<FlatList<CollectionAssignmentRow>>(null);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<CollectionAssignmentsFilters>(
    DEFAULT_COLLECTION_ASSIGNMENTS_FILTERS,
  );
  const [sortKey, setSortKey] = useState<CollectionSortKey>('due_date_asc');
  const [page, setPage] = useState(1);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [assignModal, setAssignModal] = useState(false);
  const [singleTarget, setSingleTarget] = useState<CollectionAssignmentRow | null>(null);
  const [pickedOfficerId, setPickedOfficerId] = useState<string | null>(null);

  const { sortBy, sortDir } = useMemo(() => parseCollectionSortKey(sortKey), [sortKey]);
  const activeFilterCount = useMemo(() => countActiveCollectionFilters(filters), [filters]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, sortKey]);

  const { data: officers } = useGetOfficersQuery();
  const { data, isLoading, isError, error, refetch, isFetching } = useGetCollectionAssignmentsQuery({
    search: debouncedSearch,
    officerFilter: filters.officerFilter,
    paymentStatus: filters.paymentStatus,
    collectionStatus: filters.collectionStatus,
    claimFilter: filters.claimFilter,
    outstandingOnly: filters.outstandingOnly,
    sortBy,
    sortDir,
    page,
    limit: PAGE_SIZE,
  });

  const [bulkAssign, { isLoading: bulkSaving }] = useBulkAssignCollectionOfficerMutation();
  const [assignOne, { isLoading: singleSaving }] = useAssignCollectionOfficerMutation();
  const [releaseClaim, { isLoading: releasing }] = useReleaseCollectionClaimMutation();

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  const handleApplyFilters = useCallback((next: CollectionAssignmentsFilters) => {
    setFilters(next);
    setFilterSheetVisible(false);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_COLLECTION_ASSIGNMENTS_FILTERS);
    setFilterSheetVisible(false);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const openBulkAssign = useCallback(() => {
    setSingleTarget(null);
    setPickedOfficerId(null);
    setAssignModal(true);
  }, []);

  const openSingleAssign = useCallback((row: CollectionAssignmentRow) => {
    setSingleTarget(row);
    setPickedOfficerId(row.assignedOfficerId ?? 'unassigned');
    setAssignModal(true);
  }, []);

  const closeAssignModal = useCallback(() => {
    setAssignModal(false);
    setSingleTarget(null);
    setPickedOfficerId(null);
  }, []);

  const confirmAssign = useCallback(async () => {
    const officerId = pickedOfficerId === 'unassigned' ? null : pickedOfficerId;
    try {
      if (singleTarget) {
        const result = await assignOne({ customerId: singleTarget.id, officerId }).unwrap();
        if (result.updatedCount < 1) {
          Alert.alert('No change', 'This customer could not be updated. Check your admin permissions.');
          return;
        }
        Alert.alert('Updated', 'Collection assignment saved.');
      } else if (selected.length) {
        const result = await bulkAssign({ customerIds: selected, officerId }).unwrap();
        if (result.updatedCount < 1) {
          Alert.alert('No change', 'No customers were updated. Check your admin permissions.');
          return;
        }
        Alert.alert('Updated', `${result.updatedCount} customer(s) updated.`);
        setSelected([]);
        setBulkMode(false);
      }
      closeAssignModal();
      setPage(1);
      refetch();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save assignment');
    }
  }, [
    assignOne,
    bulkAssign,
    closeAssignModal,
    pickedOfficerId,
    refetch,
    selected,
    singleTarget,
  ]);

  const onReleaseClaim = useCallback(
    async (row: CollectionAssignmentRow) => {
      try {
        await releaseClaim(row.id).unwrap();
        Alert.alert('Released', 'Customer returned to the open pool.');
        refetch();
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Could not release claim');
      }
    },
    [refetch, releaseClaim],
  );

  const renderItem = useCallback(
    ({ item }: { item: CollectionAssignmentRow }) => {
      const isSelected = selected.includes(item.id);
      const assignmentLabel = item.assignedOfficerName ?? 'Open pool';

      return (
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate('CustomerCollectionDetail', { customerId: item.id })}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.name}>{item.name}</Text>
            <CollectionStatusBadge status={item.collectionStatus} />
          </View>
          <Text style={styles.meta}>
            {item.customerId}
            {item.phone ? ` · ${item.phone}` : ''}
          </Text>
          <Text style={styles.amount}>
            Outstanding: {formatINR(item.outstandingAmount)}
            {item.nextDueDate ? ` · Due ${item.nextDueDate}` : ''}
          </Text>
          <Text style={styles.assignmentLine}>Officer: {assignmentLabel}</Text>
          {item.claimedByOfficerName ? (
            <Text style={styles.assignmentLine}>Claimed by: {item.claimedByOfficerName}</Text>
          ) : null}
          {item.paymentStatus ? (
            <Text style={styles.status}>{item.paymentStatus}</Text>
          ) : null}
          <View style={styles.actions}>
            {bulkMode ? (
              <AdminButton
                label={isSelected ? 'Selected' : 'Select'}
                variant={isSelected ? 'primary' : 'secondary'}
                onPress={() => toggleSelect(item.id)}
              />
            ) : (
              <>
                <AdminButton label="Assign" variant="secondary" onPress={() => openSingleAssign(item)} />
                {item.claimedByOfficerId ? (
                  <AdminButton
                    label="Revoke claim"
                    variant="ghost"
                    onPress={() => void onReleaseClaim(item)}
                    disabled={releasing}
                  />
                ) : null}
              </>
            )}
          </View>
        </Pressable>
      );
    },
    [bulkMode, navigation, onReleaseClaim, openSingleAssign, releasing, selected, toggleSelect],
  );

  const listHeader = useMemo(
    () => (
      <View style={adminScreenStyles.listHeader}>
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <SearchBar
              value={searchInput}
              onChangeText={handleSearchChange}
              placeholder="Search name, account, phone…"
            />
          </View>
          <Pressable style={styles.filterBtn} onPress={() => setFilterSheetVisible(true)}>
            <Text style={styles.filterBtnText}>Filters</Text>
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.controlsRow}>
          <View style={styles.sortWrap}>
            <SelectField
              label="Sort"
              value={sortKey}
              options={SORT_OPTIONS}
              onSelect={setSortKey}
            />
          </View>
          <AdminButton
            label={bulkMode ? 'Cancel bulk' : 'Bulk assign'}
            variant={bulkMode ? 'ghost' : 'secondary'}
            onPress={() => {
              setBulkMode((v) => !v);
              setSelected([]);
            }}
          />
          {bulkMode && selected.length > 0 ? (
            <AdminButton label={`Assign ${selected.length}`} onPress={openBulkAssign} />
          ) : null}
        </View>

        <Text style={styles.summaryLine}>
          Page {page} of {totalPages} · {rows.length} shown · {total.toLocaleString()} total
          {isFetching && !isLoading ? ' · Updating…' : ''}
        </Text>
      </View>
    ),
    [
      activeFilterCount,
      bulkMode,
      handleSearchChange,
      isFetching,
      isLoading,
      openBulkAssign,
      page,
      rows.length,
      searchInput,
      selected.length,
      sortKey,
      total,
      totalPages,
    ],
  );

  if (isLoading && page === 1) {
    return (
      <AdminScreenLayout>
        <SkeletonLoader rows={6} />
      </AdminScreenLayout>
    );
  }

  if (isError) {
    return (
      <AdminScreenLayout>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </AdminScreenLayout>
    );
  }

  return (
    <RoleGuard requiredPermission="payments.edit">
      <AdminScreenLayout padded={false}>
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={<AdminEmptyState title="No customers match" iconName="people-outline" />}
          ListFooterComponent={
            isFetching && page > 1 ? (
              <View style={styles.footerLoader}>
                <SkeletonLoader rows={2} />
              </View>
            ) : null
          }
          contentContainerStyle={adminScreenStyles.listContent}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.footer}>
          <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </View>

        <CollectionAssignmentsFilterSheet
          visible={filterSheetVisible}
          filters={filters}
          officers={officers ?? []}
          onClose={() => setFilterSheetVisible(false)}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
        />

        <Modal visible={assignModal} transparent animationType="slide" onRequestClose={closeAssignModal}>
          <Pressable
            style={[styles.modalBg, { paddingTop: insets.top }]}
            onPress={() => {
              Keyboard.dismiss();
              closeAssignModal();
            }}
          >
            <Pressable
              style={[styles.modalCard, { paddingBottom: spacing.md + insets.bottom }]}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.modalTitle}>
                {singleTarget ? `Assign ${singleTarget.name}` : `Assign ${selected.length} customers`}
              </Text>
              <Pressable
                style={[styles.officerOption, pickedOfficerId === 'unassigned' && styles.officerOptionActive]}
                onPress={() => setPickedOfficerId('unassigned')}
              >
                <Text style={styles.officerOptionText}>Open pool (any officer)</Text>
              </Pressable>
              {(officers ?? []).map((o) => (
                <Pressable
                  key={o.id}
                  style={[styles.officerOption, pickedOfficerId === o.id && styles.officerOptionActive]}
                  onPress={() => setPickedOfficerId(o.id)}
                >
                  <Text style={styles.officerOptionText}>{o.name}</Text>
                </Pressable>
              ))}
              <AdminButton
                label="Confirm"
                onPress={() => void confirmAssign()}
                disabled={bulkSaving || singleSaving || pickedOfficerId == null}
              />
              <AdminButton label="Cancel" variant="ghost" onPress={closeAssignModal} />
            </Pressable>
          </Pressable>
        </Modal>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  searchWrap: { flex: 1 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: adminColors.primary },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: adminColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: { fontSize: 11, fontWeight: '700', color: colors.surfaceWhite },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  sortWrap: { flex: 1, minWidth: 160 },
  summaryLine: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  footer: {
    paddingHorizontal: pageLayout.pagePadding,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  footerLoader: { paddingVertical: spacing.md },
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: { fontWeight: '700', color: colors.textPrimary, flex: 1 },
  meta: { fontSize: 13, color: colors.textSecondary },
  amount: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
  assignmentLine: { fontSize: 13, color: colors.textSecondary },
  status: { fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
  actions: { marginTop: spacing.xs },
  modalBg: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surfaceWhite,
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  officerOption: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  officerOptionActive: {
    borderColor: adminColors.primary,
    backgroundColor: adminColors.primaryTint,
  },
  officerOptionText: { fontWeight: '600', color: colors.textPrimary },
});
