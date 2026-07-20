import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type RefObject } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AdminButton,
  AdminEmptyState,
  AdminScreenLayout,
  Pagination,
  RoleGuard,
  SearchBar,
  SelectField,
} from '@/components/admin';
import {
  CollectionAssignmentsFilterSheet,
  CollectionCustomerStatusBadge,
  CollectionStatusBadge,
  countActiveCollectionFilters,
  countActiveHistoryFilters,
} from '@/components/payments';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useCollapsibleScrollHeader } from '@/hooks/admin/useCollapsibleScrollHeader';
import { useCollectionAssignmentsSync } from '@/hooks/admin/useCollectionAssignmentsSync';
import { useGetOfficersQuery } from '@/services/api/officersApi';
import {
  useAssignCollectionOfficerMutation,
  useBulkAssignCollectionOfficerMutation,
  useGetCollectionAssignmentHistoryQuery,
  useGetCollectionAssignmentsQuery,
  useReleaseCollectionClaimMutation,
} from '@/services/api/collectionAssignmentsApi';
import type {
  CollectionAssignmentHistoryRow,
  CollectionAssignmentRow,
  CollectionHistorySortKey,
  CollectionSortKey,
} from '@/types/api/admin';
import {
  DEFAULT_COLLECTION_ASSIGNMENTS_FILTERS,
  parseCollectionSortKey,
  type CollectionAssignmentsFilters,
} from '@/types/api/admin';
import type { AdminPaymentsStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { pageLayout } from '@/theme/pageLayout';
import { radius, spacing } from '@/theme/spacing';
import { collectionAssignmentLabel } from '@/utils/collectionAssignmentBoard';
import { formatCollectionHistoryAssignment } from '@/utils/collectionAssignmentHistory';
import { formatINR } from '@/utils/currencyFormat';
import { queryErrorMessage } from '@/utils/queryError';

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;
const SPLIT_MIN_WIDTH = 600;
const HEADER_HEIGHT_RATIO = 0.2;

type ScreenView = 'board' | 'history';
type BoardColumn = 'available' | 'assigned';
type MobileBoardTab = BoardColumn;

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

const HISTORY_SORT_OPTIONS: { value: CollectionHistorySortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

export function CollectionAssignmentsScreen() {
  useCollectionAssignmentsSync();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isWide = width >= SPLIT_MIN_WIDTH;
  const maxHeaderHeight = Math.round(height * HEADER_HEIGHT_RATIO);
  const navigation = useNavigation<NativeStackNavigationProp<AdminPaymentsStackParamList>>();

  const availableListRef = useRef<FlatList<CollectionAssignmentRow>>(null);
  const assignedListRef = useRef<FlatList<CollectionAssignmentRow>>(null);
  const historyListRef = useRef<FlatList<CollectionAssignmentHistoryRow>>(null);

  const {
    insetTop,
    animatedStyle,
    onHeaderLayout,
    resetCollapse,
    scrollHandlers,
  } = useCollapsibleScrollHeader({ maxHeight: maxHeaderHeight });

  const [screenView, setScreenView] = useState<ScreenView>('board');
  const [searchInput, setSearchInput] = useState('');
  const [historySearchInput, setHistorySearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedHistorySearch, setDebouncedHistorySearch] = useState('');
  const [filters, setFilters] = useState<CollectionAssignmentsFilters>(
    DEFAULT_COLLECTION_ASSIGNMENTS_FILTERS,
  );
  const [sortKey, setSortKey] = useState<CollectionSortKey>('due_date_asc');
  const [historySortKey, setHistorySortKey] = useState<CollectionHistorySortKey>('newest');
  const [availablePage, setAvailablePage] = useState(1);
  const [assignedPage, setAssignedPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [assignModal, setAssignModal] = useState(false);
  const [singleTarget, setSingleTarget] = useState<CollectionAssignmentRow | null>(null);
  const [pickedOfficerId, setPickedOfficerId] = useState<string | null>(null);
  const [collectionAmountInput, setCollectionAmountInput] = useState('');
  const [mobileTab, setMobileTab] = useState<MobileBoardTab>('available');

  const { sortBy, sortDir } = useMemo(() => parseCollectionSortKey(sortKey), [sortKey]);
  const activeFilterCount = useMemo(
    () =>
      screenView === 'history'
        ? countActiveHistoryFilters(filters)
        : countActiveCollectionFilters(filters),
    [filters, screenView],
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedHistorySearch(historySearchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [historySearchInput]);

  useEffect(() => {
    setAvailablePage(1);
    setAssignedPage(1);
    setHistoryPage(1);
    resetCollapse();
  }, [debouncedSearch, debouncedHistorySearch, filters, sortKey, historySortKey, resetCollapse]);

  useEffect(() => {
    if (filters.queueView === 'due_for_collection') setMobileTab('assigned');
    else if (filters.queueView === 'upcoming') setMobileTab('available');
  }, [filters.queueView]);

  const { data: officers } = useGetOfficersQuery();

  const boardEnabled = screenView === 'board';
  const historyEnabled = screenView === 'history';

  const {
    data: availableData,
    isLoading: availableLoading,
    isError: availableError,
    error: availableQueryError,
    refetch: refetchAvailable,
    isFetching: availableFetching,
  } = useGetCollectionAssignmentsQuery(
    {
      search: debouncedSearch,
      paymentStatus: filters.paymentStatus,
      collectionStatus: 'inactive',
      queueView: 'upcoming',
      sortBy,
      sortDir,
      page: availablePage,
      limit: PAGE_SIZE,
    },
    { skip: !boardEnabled },
  );

  const assignedCollectionStatus =
    filters.collectionStatus === 'inactive' ? 'all' : filters.collectionStatus;

  const {
    data: assignedData,
    isLoading: assignedLoading,
    isError: assignedError,
    error: assignedQueryError,
    refetch: refetchAssigned,
    isFetching: assignedFetching,
  } = useGetCollectionAssignmentsQuery(
    {
      search: debouncedSearch,
      officerFilter: filters.officerFilter,
      paymentStatus: filters.paymentStatus,
      collectionStatus: assignedCollectionStatus,
      claimFilter: filters.claimFilter,
      outstandingOnly: filters.outstandingOnly,
      queueView: 'due_for_collection',
      sortBy,
      sortDir,
      page: assignedPage,
      limit: PAGE_SIZE,
    },
    { skip: !boardEnabled },
  );

  const {
    data: historyData,
    isLoading: historyLoading,
    isError: historyError,
    error: historyQueryError,
    refetch: refetchHistory,
    isFetching: historyFetching,
  } = useGetCollectionAssignmentHistoryQuery(
    {
      search: debouncedHistorySearch,
      officerFilter: filters.officerFilter,
      statusFilter: filters.collectionStatus,
      sortKey: historySortKey,
      page: historyPage,
      limit: PAGE_SIZE,
    },
    { skip: !historyEnabled },
  );

  const [bulkAssign, { isLoading: bulkSaving }] = useBulkAssignCollectionOfficerMutation();
  const [assignOne, { isLoading: singleSaving }] = useAssignCollectionOfficerMutation();
  const [releaseClaim, { isLoading: releasing }] = useReleaseCollectionClaimMutation();

  const availableRows = availableData?.items ?? [];
  const assignedRows = assignedData?.items ?? [];
  const historyRows = historyData?.items ?? [];
  const availableTotal = availableData?.total ?? 0;
  const assignedTotal = assignedData?.total ?? 0;
  const historyTotal = historyData?.total ?? 0;
  const availableTotalPages = Math.max(1, Math.ceil(availableTotal / PAGE_SIZE));
  const assignedTotalPages = Math.max(1, Math.ceil(assignedTotal / PAGE_SIZE));
  const historyTotalPages = Math.max(1, Math.ceil(historyTotal / PAGE_SIZE));

  const refetch = useCallback(() => {
    void refetchAvailable();
    void refetchAssigned();
    void refetchHistory();
  }, [refetchAssigned, refetchAvailable, refetchHistory]);

  const isLoading =
    boardEnabled
      ? (availableLoading || assignedLoading) && availablePage === 1 && assignedPage === 1
      : historyLoading && historyPage === 1;
  const isError = boardEnabled ? availableError || assignedError : historyError;
  const error = boardEnabled ? availableQueryError ?? assignedQueryError : historyQueryError;
  const isFetching = boardEnabled ? availableFetching || assignedFetching : historyFetching;

  const handleAvailablePageChange = useCallback((nextPage: number) => {
    setAvailablePage(nextPage);
    availableListRef.current?.scrollToOffset({ offset: 0, animated: true });
    resetCollapse();
  }, [resetCollapse]);

  const handleAssignedPageChange = useCallback((nextPage: number) => {
    setAssignedPage(nextPage);
    assignedListRef.current?.scrollToOffset({ offset: 0, animated: true });
    resetCollapse();
  }, [resetCollapse]);

  const handleHistoryPageChange = useCallback((nextPage: number) => {
    setHistoryPage(nextPage);
    historyListRef.current?.scrollToOffset({ offset: 0, animated: true });
    resetCollapse();
  }, [resetCollapse]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  const handleHistorySearchChange = useCallback((value: string) => {
    setHistorySearchInput(value);
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
    setCollectionAmountInput('');
    setAssignModal(true);
  }, []);

  const openSingleAssign = useCallback((row: CollectionAssignmentRow) => {
    setSingleTarget(row);
    setPickedOfficerId(row.assignedOfficerId ?? 'unassigned');
    setCollectionAmountInput(row.outstandingAmount > 0 ? String(row.outstandingAmount) : '');
    setAssignModal(true);
  }, []);

  const closeAssignModal = useCallback(() => {
    setAssignModal(false);
    setSingleTarget(null);
    setPickedOfficerId(null);
    setCollectionAmountInput('');
  }, []);

  const confirmAssign = useCallback(async () => {
    const officerId = pickedOfficerId === 'unassigned' ? null : pickedOfficerId;
    const parsedAmount = collectionAmountInput.trim()
      ? Number(collectionAmountInput.replace(/,/g, ''))
      : null;
    if (parsedAmount != null && (!Number.isFinite(parsedAmount) || parsedAmount <= 0)) {
      Alert.alert('Invalid amount', 'Enter a collection amount greater than zero, or leave blank.');
      return;
    }
    try {
      if (singleTarget) {
        const result = await assignOne({
          customerId: singleTarget.id,
          officerId,
          collectionAmount: parsedAmount,
        }).unwrap();
        if (result.updatedCount < 1) {
          Alert.alert('No change', 'This customer could not be updated. Check your admin permissions.');
          return;
        }
        Alert.alert('Updated', 'Collection assignment saved.');
      } else if (selected.length) {
        const result = await bulkAssign({
          customerIds: selected,
          officerId,
          collectionAmount: parsedAmount,
        }).unwrap();
        if (result.updatedCount < 1) {
          Alert.alert('No change', 'No customers were updated. Check your admin permissions.');
          return;
        }
        Alert.alert('Updated', `${result.updatedCount} customer(s) updated.`);
        setSelected([]);
        setBulkMode(false);
      }
      closeAssignModal();
      setAvailablePage(1);
      setAssignedPage(1);
      refetch();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save assignment');
    }
  }, [
    assignOne,
    bulkAssign,
    closeAssignModal,
    collectionAmountInput,
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

  const renderAvailableItem = useCallback(
    ({ item }: { item: CollectionAssignmentRow }) => {
      const isSelected = selected.includes(item.id);
      const isCollected = item.collectionStatus === 'collected';

      return (
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate('CustomerCollectionDetail', { customerId: item.id })}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.name}>{item.name}</Text>
            <CollectionCustomerStatusBadge
              isBlocked={item.isBlocked}
              paymentStatus={item.paymentStatus}
              collectionStatus={item.collectionStatus}
            />
          </View>
          <Text style={styles.meta}>
            {item.customerId}
            {item.phone ? ` · ${item.phone}` : ''}
          </Text>
          <Text style={styles.amount}>
            Outstanding: {formatINR(item.outstandingAmount)}
            {item.nextDueDate ? ` · Due ${item.nextDueDate}` : ''}
          </Text>
          <View style={styles.actions}>
            {bulkMode ? (
              <AdminButton
                label={isSelected ? 'Selected' : 'Select'}
                variant={isSelected ? 'primary' : 'secondary'}
                onPress={() => toggleSelect(item.id)}
              />
            ) : isCollected ? (
              <AdminButton
                label="View"
                variant="secondary"
                onPress={() =>
                  navigation.navigate('CustomerCollectionDetail', { customerId: item.id })
                }
              />
            ) : (
              <AdminButton label="Assign" variant="secondary" onPress={() => openSingleAssign(item)} />
            )}
          </View>
        </Pressable>
      );
    },
    [bulkMode, navigation, openSingleAssign, selected, toggleSelect],
  );

  const renderAssignedItem = useCallback(
    ({ item }: { item: CollectionAssignmentRow }) => {
      const isCollected = item.collectionStatus === 'collected';
      const assignmentLabel = collectionAssignmentLabel(item);
      const canAssign = !isCollected;

      return (
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate('CustomerCollectionDetail', { customerId: item.id })}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.name}>{item.name}</Text>
            <CollectionCustomerStatusBadge
              isBlocked={item.isBlocked}
              paymentStatus={item.paymentStatus}
              collectionStatus={item.collectionStatus}
            />
          </View>
          <Text style={styles.meta}>
            {item.customerId}
            {item.phone ? ` · ${item.phone}` : ''}
          </Text>
          <Text style={styles.amount}>
            Outstanding: {formatINR(item.outstandingAmount)}
            {item.nextDueDate ? ` · Due ${item.nextDueDate}` : ''}
          </Text>
          <Text style={styles.assignmentLine}>Assignment: {assignmentLabel}</Text>
          <View style={styles.actions}>
            {isCollected ? (
              <AdminButton
                label="View"
                variant="secondary"
                onPress={() =>
                  navigation.navigate('CustomerCollectionDetail', { customerId: item.id })
                }
              />
            ) : (
              <>
                <AdminButton
                  label="Reassign"
                  variant="secondary"
                  onPress={() => openSingleAssign(item)}
                  disabled={!canAssign}
                />
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
    [navigation, onReleaseClaim, openSingleAssign, releasing],
  );

  const renderHistoryItem = useCallback(
    ({ item }: { item: CollectionAssignmentHistoryRow }) => (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate('CustomerCollectionDetail', { customerId: item.customerId })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.name} numberOfLines={1}>
            {item.customerName}
          </Text>
          <CollectionStatusBadge status={item.status} />
        </View>
        <Text style={styles.meta}>
          {item.customerAccountId}
          {item.customerPhone ? ` · ${item.customerPhone}` : ''}
        </Text>
        <Text style={styles.assignmentLine}>{formatCollectionHistoryAssignment(item)}</Text>
        {item.notes ? <Text style={styles.historyNotes}>{item.notes}</Text> : null}
        <Text style={styles.historyMeta}>
          {new Date(item.createdAt).toLocaleString()}
          {item.actorRole ? ` · ${item.actorRole}` : ''}
        </Text>
      </Pressable>
    ),
    [navigation],
  );

  const headerContent = (
    <View style={styles.headerInner}>
      <View style={styles.viewModeRow}>
        <Pressable
          style={[styles.viewModeTab, screenView === 'board' && styles.viewModeTabActive]}
          onPress={() => setScreenView('board')}
        >
          <Text
            style={[styles.viewModeText, screenView === 'board' && styles.viewModeTextActive]}
          >
            Assignment board
          </Text>
        </Pressable>
        <Pressable
          style={[styles.viewModeTab, screenView === 'history' && styles.viewModeTabActive]}
          onPress={() => setScreenView('history')}
        >
          <Text
            style={[styles.viewModeText, screenView === 'history' && styles.viewModeTextActive]}
          >
            History
          </Text>
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <SearchBar
            value={screenView === 'board' ? searchInput : historySearchInput}
            onChangeText={screenView === 'board' ? handleSearchChange : handleHistorySearchChange}
            placeholder={
              screenView === 'board'
                ? 'Search name, account, phone…'
                : 'Search customer name, account, phone…'
            }
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
          {screenView === 'board' ? (
            <SelectField label="Sort" value={sortKey} options={SORT_OPTIONS} onSelect={setSortKey} />
          ) : (
            <SelectField
              label="Sort"
              value={historySortKey}
              options={HISTORY_SORT_OPTIONS}
              onSelect={setHistorySortKey}
            />
          )}
        </View>
        {screenView === 'board' ? (
          <AdminButton
            label={bulkMode ? 'Cancel bulk' : 'Bulk assign'}
            variant={bulkMode ? 'ghost' : 'secondary'}
            onPress={() => {
              setBulkMode((v) => !v);
              setSelected([]);
              setMobileTab('available');
            }}
          />
        ) : null}
        {screenView === 'board' && bulkMode && selected.length > 0 ? (
          <AdminButton label={`Assign ${selected.length}`} onPress={openBulkAssign} />
        ) : null}
      </View>

      <Text style={styles.summaryLine} numberOfLines={1}>
        {screenView === 'board'
          ? `${availableTotal.toLocaleString()} awaiting · ${assignedTotal.toLocaleString()} in queue${
              debouncedSearch ? ' · Search' : ''
            }${isFetching && !isLoading ? ' · Updating…' : ''}`
          : `${historyTotal.toLocaleString()} events${
              debouncedHistorySearch ? ' · Search' : ''
            }${isFetching && !isLoading ? ' · Updating…' : ''}`}
      </Text>
    </View>
  );

  const listInsetStyle = insetTop > 0 ? { paddingTop: insetTop } : null;

  const renderColumn = useCallback(
    (
      column: BoardColumn,
      title: string,
      data: CollectionAssignmentRow[],
      total: number,
      totalPages: number,
      page: number,
      onPageChange: (next: number) => void,
      listRef: RefObject<FlatList<CollectionAssignmentRow> | null>,
      renderItem: (info: { item: CollectionAssignmentRow }) => ReactElement,
      emptyTitle: string,
      emptySubtitle: string,
    ) => (
      <View style={isWide ? styles.column : styles.columnMobile}>
        <View style={styles.columnHeader}>
          <Text style={styles.columnTitle}>{title}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{total.toLocaleString()}</Text>
          </View>
        </View>
        {data.length === 0 ? (
          <AdminEmptyState title={emptyTitle} subtitle={emptySubtitle} iconName="people-outline" />
        ) : (
          <FlatList
            ref={listRef}
            data={data}
            keyExtractor={(item) => `${column}-${item.id}`}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.columnListContent}
            style={styles.columnList}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            {...scrollHandlers}
            ListFooterComponent={
              totalPages > 1 ? (
                <View style={styles.columnFooter}>
                  <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
                </View>
              ) : null
            }
          />
        )}
      </View>
    ),
    [isWide, scrollHandlers],
  );

  if (isLoading) {
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
        <View style={styles.page}>
          <Animated.View
            style={[styles.headerFloat, animatedStyle]}
            pointerEvents="box-none"
          >
            <View
              style={[styles.headerCard, { maxHeight: maxHeaderHeight }]}
              onLayout={(e) => onHeaderLayout(Math.min(e.nativeEvent.layout.height, maxHeaderHeight))}
            >
              {headerContent}
            </View>
          </Animated.View>

          <View style={[styles.contentStage, listInsetStyle]}>
            {screenView === 'board' ? (
              isWide ? (
                <View style={styles.columnsRow}>
                  {renderColumn(
                    'available',
                    'Customers needing payment',
                    availableRows,
                    availableTotal,
                    availableTotalPages,
                    availablePage,
                    handleAvailablePageChange,
                    availableListRef,
                    renderAvailableItem,
                    'No customers awaiting assignment',
                    'Overdue and upcoming renewals appear here before you assign them.',
                  )}
                  <View style={styles.columnDivider} />
                  {renderColumn(
                    'assigned',
                    'Assigned · pool or officers',
                    assignedRows,
                    assignedTotal,
                    assignedTotalPages,
                    assignedPage,
                    handleAssignedPageChange,
                    assignedListRef,
                    renderAssignedItem,
                    'No assignments in queue',
                    'Assign customers to an officer or the open pool from the left column.',
                  )}
                </View>
              ) : (
                <>
                  <View style={styles.boardTabRow}>
                    <Pressable
                      style={[styles.tab, mobileTab === 'available' && styles.tabActive]}
                      onPress={() => setMobileTab('available')}
                    >
                      <Text style={[styles.tabText, mobileTab === 'available' && styles.tabTextActive]}>
                        Awaiting ({availableTotal})
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.tab, mobileTab === 'assigned' && styles.tabActive]}
                      onPress={() => setMobileTab('assigned')}
                    >
                      <Text style={[styles.tabText, mobileTab === 'assigned' && styles.tabTextActive]}>
                        Assigned ({assignedTotal})
                      </Text>
                    </Pressable>
                  </View>
                  {mobileTab === 'available'
                    ? renderColumn(
                        'available',
                        'Customers needing payment',
                        availableRows,
                        availableTotal,
                        availableTotalPages,
                        availablePage,
                        handleAvailablePageChange,
                        availableListRef,
                        renderAvailableItem,
                        'No customers awaiting assignment',
                        'Overdue and upcoming renewals appear here before you assign them.',
                      )
                    : renderColumn(
                        'assigned',
                        'Assigned · pool or officers',
                        assignedRows,
                        assignedTotal,
                        assignedTotalPages,
                        assignedPage,
                        handleAssignedPageChange,
                        assignedListRef,
                        renderAssignedItem,
                        'No assignments in queue',
                        'Assign customers to an officer or the open pool from the awaiting tab.',
                      )}
                </>
              )
            ) : (
              <FlatList
                ref={historyListRef}
                data={historyRows}
                keyExtractor={(item) => item.id}
                renderItem={renderHistoryItem}
                style={styles.historyList}
                contentContainerStyle={styles.historyListContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                {...scrollHandlers}
                ListEmptyComponent={
                  <AdminEmptyState
                    title="No assignment history"
                    subtitle="Assignment and claim events will appear here after admins assign customers."
                    iconName="time-outline"
                  />
                }
                ListFooterComponent={
                  historyTotalPages > 1 ? (
                    <View style={styles.historyFooter}>
                      <Pagination
                        page={historyPage}
                        totalPages={historyTotalPages}
                        onPageChange={handleHistoryPageChange}
                      />
                    </View>
                  ) : null
                }
              />
            )}
          </View>
        </View>

        <CollectionAssignmentsFilterSheet
          visible={filterSheetVisible}
          filters={filters}
          officers={officers ?? []}
          mode={screenView}
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
              {singleTarget ? (
                <Text style={styles.modalHint}>
                  Effective due: {formatINR(singleTarget.outstandingAmount)}
                  {singleTarget.outstandingAmount <= 0
                    ? ' — stored balance is ₹0; amount below can override or use plan-based due.'
                    : ''}
                </Text>
              ) : null}
              <Text style={styles.modalLabel}>COLLECTION AMOUNT (OPTIONAL OVERRIDE)</Text>
              <TextInput
                style={styles.amountInput}
                value={collectionAmountInput}
                onChangeText={setCollectionAmountInput}
                keyboardType="decimal-pad"
                placeholder={
                  singleTarget && singleTarget.outstandingAmount > 0
                    ? String(singleTarget.outstandingAmount)
                    : 'Plan-based or manual amount'
                }
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={styles.modalHint}>
                Leave blank to use plan price or stored outstanding. Set a value to override what
                the officer should collect.
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
  page: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: pageLayout.pagePadding,
    paddingBottom: spacing.md,
  },
  headerFloat: {
    position: 'absolute',
    top: 0,
    left: pageLayout.pagePadding,
    right: pageLayout.pagePadding,
    zIndex: 20,
    elevation: 20,
  },
  headerCard: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
  },
  headerInner: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  viewModeRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.sm,
    padding: 3,
    gap: 3,
  },
  viewModeTab: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  viewModeTabActive: { backgroundColor: adminColors.primaryTint },
  viewModeText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  viewModeTextActive: { color: adminColors.primary },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  searchWrap: { flex: 1 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  filterBtnText: { fontSize: 12, fontWeight: '600', color: adminColors.primary },
  filterBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: adminColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: colors.surfaceWhite },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  sortWrap: { flex: 1, minWidth: 140 },
  summaryLine: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  contentStage: { flex: 1, minHeight: 0 },
  columnsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 0,
  },
  column: { flex: 1, minWidth: 0, minHeight: 0 },
  columnMobile: { flex: 1, minHeight: 0 },
  columnDivider: {
    width: 1,
    backgroundColor: colors.borderDefault,
    marginVertical: spacing.xs,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  columnTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  countBadge: {
    backgroundColor: colors.borderDefault,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  countText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  columnList: { flex: 1 },
  columnListContent: { paddingBottom: spacing.lg },
  columnFooter: { paddingTop: spacing.sm },
  boardTabRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.sm,
    padding: 3,
  },
  tab: { flex: 1, paddingVertical: spacing.xs, alignItems: 'center', borderRadius: radius.sm },
  tabActive: { backgroundColor: adminColors.primaryTint },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: adminColors.primary },
  historyList: { flex: 1 },
  historyListContent: { paddingBottom: spacing.lg },
  historyFooter: { paddingTop: spacing.sm, paddingBottom: spacing.md },
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
  historyNotes: { fontSize: 13, color: colors.textPrimary },
  historyMeta: { fontSize: 12, color: colors.textSecondary },
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
  modalHint: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    fontSize: 15,
    color: colors.textPrimary,
    minHeight: 48,
  },
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
