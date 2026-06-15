import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import {
  AdminEmptyState,
  AdminWebLayout,
  AvatarIcon,
  RoleGuard,
  SearchBar,
  StatusBadge,
  useAdminPermission,
} from '@/components/admin';
import { ErrorState, KeyboardDismissView, SkeletonLoader } from '@/components/common';
import { useGetAdminUsersQuery } from '@/store/api/endpoints';
import { fetchPlanById } from '@/services/planService';
import type { AdminUserListItem } from '@/types/api/admin';
import type { AdminUsersStackParamList } from '@/types/navigation';
import { queryErrorMessage } from '@/utils/queryError';

import { ui } from './usersUi';

type Props = NativeStackScreenProps<AdminUsersStackParamList, 'UserList'>;

type ViewMode = 'list' | 'grid';
type CityFilter = 'all' | string;
type StatusFilter = 'all' | 'active' | 'blocked' | 'expired';
type BlockFilter = 'all' | 'blocked' | 'unblocked';

const PAGE_SIZE = 50;
const ADD_BTN_H = 48;
const PAGE_BTN_SIZE = 36;
const PAGE_BTN_GAP = 6;
const FILTER_LIST_GAP = ui.sectionGap;
const FILTER_TUCK_UNDER = ui.sectionGap;

function PlanBadge({ label }: { label: string }) {
  return (
    <View style={styles.planBadge}>
      <Text style={styles.planBadgeText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

type FilterDropdownId = 'city' | 'status';

function FilterDropdown<T extends string>({
  dropdownId,
  isOpen,
  onToggle,
  onClose,
  label,
  value,
  options,
  onSelect,
}: {
  dropdownId: FilterDropdownId;
  isOpen: boolean;
  onToggle: (id: FilterDropdownId) => void;
  onClose: () => void;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onSelect: (value: T) => void;
}) {
  const selected = options.find((o) => o.value === value)?.label ?? value;
  const isActive = value !== 'all';

  return (
    <View style={[styles.dropdownWrap, isOpen && styles.dropdownWrapOpen]}>
      <Pressable
        style={[styles.filterChip, isActive && styles.filterChipActive]}
        onPress={() => onToggle(dropdownId)}
        hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
      >
        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]} numberOfLines={1}>
          {label}: {selected}
        </Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={isActive ? ui.brand : ui.textSecondary}
        />
      </Pressable>
      {isOpen ? (
        <>
          <Pressable style={styles.dropdownBackdrop} onPress={onClose} accessibilityLabel="Close filter menu" />
          <View style={styles.dropdownMenu}>
            {options.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.dropdownItem, value === opt.value && styles.dropdownItemActive]}
                onPress={() => {
                  onSelect(opt.value);
                  onClose();
                }}
              >
                <Text style={[styles.dropdownItemText, value === opt.value && styles.dropdownItemTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const pageStep = PAGE_BTN_SIZE + PAGE_BTN_GAP;

  const allPages = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages],
  );

  useEffect(() => {
    if (totalPages <= 1) return;
    const targetX = Math.max(0, (page - 1) * pageStep - pageStep * 2);
    scrollRef.current?.scrollTo({ x: targetX, animated: true });
  }, [page, pageStep, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <View style={styles.pagination}>
      <Pressable
        style={[styles.pageBtn, styles.pageNavBtn, page <= 1 && styles.pageBtnDisabled]}
        disabled={page <= 1}
        onPress={() => onPageChange(page - 1)}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      >
        <Ionicons name="chevron-back" size={16} color={page <= 1 ? ui.textSecondary : ui.text} />
      </Pressable>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pageScroll}
        contentContainerStyle={styles.pageScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {allPages.map((p) => (
          <Pressable
            key={p}
            style={[styles.pageBtn, page === p && styles.pageBtnActive]}
            onPress={() => onPageChange(p)}
            hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
          >
            <Text style={[styles.pageBtnText, page === p && styles.pageBtnTextActive]}>{p}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable
        style={[styles.pageBtn, styles.pageNavBtn, page >= totalPages && styles.pageBtnDisabled]}
        disabled={page >= totalPages}
        onPress={() => onPageChange(page + 1)}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      >
        <Ionicons
          name="chevron-forward"
          size={16}
          color={page >= totalPages ? ui.textSecondary : ui.text}
        />
      </Pressable>
    </View>
  );
}

function SubscriberRow({ row, onView }: { row: AdminUserListItem; onView: (userId: string) => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.subscriberRow, pressed && styles.subscriberRowPressed]}
      onPress={() => onView(row.id)}
    >
      <AvatarIcon name={row.name} size={44} />
      <View style={styles.subscriberMain}>
        <View style={styles.subscriberTop}>
          <Text style={styles.subscriberName} numberOfLines={1}>
            {row.name}
          </Text>
          <StatusBadge status={row.status} />
        </View>
        {row.username ? (
          <Text style={styles.subscriberHandle} numberOfLines={1}>
            @{row.username}
          </Text>
        ) : null}
        <View style={styles.subscriberMeta}>
          <Text style={styles.subscriberMetaText} numberOfLines={1}>
            ID {row.legacyUserId ?? '—'}
          </Text>
          <Text style={styles.subscriberMetaDot}>·</Text>
          <Text style={styles.subscriberMetaText} numberOfLines={1}>
            {row.phone ?? '—'}
          </Text>
        </View>
        <View style={styles.subscriberFooter}>
          <PlanBadge label={row.planName} />
          {row.city ? (
            <Text style={styles.subscriberCity} numberOfLines={1}>
              {row.city}
            </Text>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={ui.textSecondary} />
    </Pressable>
  );
}

export function UserListScreen({ navigation, route }: Props) {
  const canCreateUser = useAdminPermission('users.create');
  const filterPlanId = route.params?.planId;
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const [search, setSearch] = useState('');
  const [city, setCity] = useState<CityFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [blockFilter, setBlockFilter] = useState<BlockFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  const [filterPlanName, setFilterPlanName] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<FilterDropdownId | null>(null);
  const [filterHeight, setFilterHeight] = useState(0);

  const filterHeightRef = useRef(0);
  const filterCollapse = useRef(new Animated.Value(0)).current;
  const collapseRef = useRef(0);
  const lastScrollY = useRef(0);
  const listRef = useRef<FlatList<AdminUserListItem>>(null);
  const gridScrollRef = useRef<ScrollView>(null);
  const openDropdownRef = useRef<FilterDropdownId | null>(null);
  openDropdownRef.current = openDropdown;

  const closeDropdown = useCallback(() => setOpenDropdown(null), []);

  const listInsetTop = filterHeight > 0 ? filterHeight + FILTER_LIST_GAP : 0;

  const filterAnimatedStyle = useMemo(() => {
    if (filterHeight <= 0) return null;
    const hideDistance = filterHeight + FILTER_TUCK_UNDER;
    return {
      transform: [
        {
          translateY: filterCollapse.interpolate({
            inputRange: [0, filterHeight],
            outputRange: [0, -hideDistance],
            extrapolate: 'clamp',
          }),
        },
      ],
    };
  }, [filterHeight, filterCollapse]);

  const resetFilterCollapse = useCallback(() => {
    collapseRef.current = 0;
    lastScrollY.current = 0;
    filterCollapse.setValue(0);
  }, [filterCollapse]);

  const pinCollapseAtBottom = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const maxHide = filterHeightRef.current;
      if (maxHide <= 0) return;

      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const atBottom =
        contentOffset.y + layoutMeasurement.height >= contentSize.height - 8;

      if (atBottom && collapseRef.current > 0) {
        collapseRef.current = maxHide;
        filterCollapse.setValue(maxHide);
      }
    },
    [filterCollapse],
  );

  const handleListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const maxHide = filterHeightRef.current;
      if (maxHide <= 0) return;

      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const y = Math.max(0, contentOffset.y);
      const dy = y - lastScrollY.current;
      lastScrollY.current = y;

      if (openDropdownRef.current) {
        closeDropdown();
      }

      const atBottom = y + layoutMeasurement.height >= contentSize.height - 8;
      const atTop = y <= 0.5;

      let next = collapseRef.current;

      if (atTop) {
        next = 0;
      } else if (atBottom && dy > 0) {
        next = maxHide;
      } else if (dy > 0) {
        next = Math.min(maxHide, next + dy);
      } else if (dy < 0) {
        next = Math.max(0, next + dy);
      }

      const rounded = Math.round(next);
      if (rounded !== Math.round(collapseRef.current)) {
        collapseRef.current = rounded;
        filterCollapse.setValue(rounded);
      }
    },
    [closeDropdown, filterCollapse],
  );

  useEffect(() => {
    resetFilterCollapse();
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    gridScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [page, resetFilterCollapse]);

  const handleFilterBarLayout = useCallback((height: number) => {
    const rounded = Math.round(height);
    if (rounded > 0 && filterHeightRef.current !== rounded) {
      filterHeightRef.current = rounded;
      setFilterHeight(rounded);
    }
  }, []);

  const toggleDropdown = useCallback((id: FilterDropdownId) => {
    setOpenDropdown((prev) => (prev === id ? null : id));
  }, []);

  useEffect(() => {
    if (!filterPlanId) {
      setFilterPlanName(null);
      return;
    }
    void fetchPlanById(filterPlanId)
      .then((plan) => setFilterPlanName(plan.displayName || plan.name))
      .catch(() => setFilterPlanName(null));
  }, [filterPlanId]);

  const { data, isLoading, isFetching, isError, error, refetch } = useGetAdminUsersQuery({
    page,
    limit: PAGE_SIZE,
    search,
    city: city === 'all' ? undefined : city,
    status,
    blockFilter,
  });

  const users = useMemo(() => {
    const items = data?.items ?? [];
    if (!filterPlanName) return items;
    return items.filter((u) => u.planName.toLowerCase() === filterPlanName.toLowerCase());
  }, [data?.items, filterPlanName]);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const cities = data?.cities ?? [];

  const blockedInView = useMemo(
    () => users.filter((u) => u.status === 'blocked' || u.isBlocked).length,
    [users],
  );

  const cityOptions = useMemo(
    () => [{ value: 'all' as CityFilter, label: 'All' }, ...cities.map((c) => ({ value: c, label: c }))],
    [cities],
  );

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'blocked', label: 'Blocked' },
    { value: 'expired', label: 'Expired' },
  ];

  const resetPage = useCallback(() => setPage(1), []);

  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value);
      resetPage();
    },
    [resetPage],
  );

  const handleCity = useCallback(
    (value: CityFilter) => {
      setCity(value);
      resetPage();
      closeDropdown();
    },
    [resetPage, closeDropdown],
  );

  const handleStatus = useCallback(
    (value: StatusFilter) => {
      setStatus(value);
      resetPage();
      closeDropdown();
    },
    [resetPage, closeDropdown],
  );

  const handleBlockFilter = useCallback(
    (value: BlockFilter) => {
      setBlockFilter((prev) => (prev === value ? 'all' : value));
      resetPage();
      closeDropdown();
    },
    [resetPage, closeDropdown],
  );

  const handleViewUser = useCallback(
    (userId: string) => navigation.navigate('UserDetail', { userId }),
    [navigation],
  );

  const renderGridCard = useCallback(
    (item: AdminUserListItem) => (
      <Pressable
        key={item.id}
        style={({ pressed }) => [
          styles.gridCard,
          isWide && styles.gridCardWide,
          pressed && styles.subscriberRowPressed,
        ]}
        onPress={() => navigation.navigate('UserDetail', { userId: item.id })}
      >
        <View style={styles.gridCardHeader}>
          <AvatarIcon name={item.name} size={44} />
          <View style={styles.gridCardMeta}>
            <Text style={styles.subscriberName}>{item.name}</Text>
            {item.username ? <Text style={styles.subscriberHandle}>@{item.username}</Text> : null}
          </View>
          <StatusBadge status={item.status} />
        </View>
        <Text style={styles.gridDetail}>ID {item.legacyUserId ?? '—'}</Text>
        <Text style={styles.gridDetail}>{item.phone ?? '—'}</Text>
        <Text style={styles.gridDetail}>{item.city ?? '—'}</Text>
        <View style={styles.gridBadges}>
          <PlanBadge label={item.planName} />
        </View>
      </Pressable>
    ),
    [navigation, isWide],
  );

  const renderSubscriberRow = useCallback(
    ({ item }: { item: AdminUserListItem }) => <SubscriberRow row={item} onView={handleViewUser} />,
    [handleViewUser],
  );

  if (isLoading) {
    return (
      <Screen safeAreaTop={false} style={styles.canvas}>
        <SkeletonLoader rows={10} showAvatar />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen safeAreaTop={false} style={styles.canvas}>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <RoleGuard requiredPermission="users.view">
      <Screen padded={false} safeAreaTop={false} style={styles.canvas}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          <KeyboardDismissView style={styles.page}>
            <AdminWebLayout>
              <View style={styles.headerShell}>
                <View style={styles.actionCard}>
                  <View style={styles.searchRow}>
                    <View style={styles.searchWrap}>
                      <Ionicons name="search-outline" size={18} color={ui.textSecondary} style={styles.searchIcon} />
                      <SearchBar
                        value={search}
                        onChangeText={handleSearch}
                        placeholder="Search name, email, phone, ID…"
                        containerStyle={styles.searchBarContainer}
                        style={styles.searchInput}
                      />
                    </View>
                    {canCreateUser ? (
                      <Pressable
                        style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
                        onPress={() => navigation.navigate('AddUser')}
                      >
                        <Text style={styles.addBtnText}>Add New</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <View style={styles.summaryRow}>
                    <View style={styles.summaryBlock}>
                      <Text style={styles.summaryEyebrow}>Total users</Text>
                      <Text style={styles.summaryValue}>{total.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryBlock}>
                      <Text style={styles.summaryEyebrow}>Showing</Text>
                      <Text style={styles.summaryValueSm}>
                        {users.length}
                        <Text style={styles.summaryValueMuted}> / {total.toLocaleString('en-IN')}</Text>
                      </Text>
                      {blockedInView > 0 ? (
                        <Text style={styles.summaryInsight}>{blockedInView} blocked in view</Text>
                      ) : null}
                      {isFetching ? <Text style={styles.summaryInsight}>Updating…</Text> : null}
                    </View>
                  </View>
                </View>

                {filterPlanName ? (
                  <View style={styles.planFilterBanner}>
                    <Text style={styles.planFilterText}>Filtered by plan: {filterPlanName}</Text>
                    <Pressable onPress={() => navigation.setParams({ planId: undefined })} hitSlop={8}>
                      <Text style={styles.planFilterClear}>Clear</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>

              <View style={styles.listStage}>
                <Animated.View
                  style={[styles.filtersFloat, filterAnimatedStyle]}
                  pointerEvents="box-none"
                >
                  <View
                    style={styles.filtersCard}
                    onLayout={(e) => handleFilterBarLayout(e.nativeEvent.layout.height)}
                  >
                    <Text style={styles.filtersEyebrow}>Filters</Text>
                    <View style={styles.filtersRow}>
                      <View style={styles.filtersLeft}>
                        <FilterDropdown
                          dropdownId="city"
                          isOpen={openDropdown === 'city'}
                          onToggle={toggleDropdown}
                          onClose={closeDropdown}
                          label="City"
                          value={city}
                          options={cityOptions}
                          onSelect={handleCity}
                        />
                        <FilterDropdown
                          dropdownId="status"
                          isOpen={openDropdown === 'status'}
                          onToggle={toggleDropdown}
                          onClose={closeDropdown}
                          label="Status"
                          value={status}
                          options={statusOptions}
                          onSelect={handleStatus}
                        />
                        <Pressable
                          style={[styles.filterChip, blockFilter === 'blocked' && styles.filterChipActive]}
                          onPress={() => handleBlockFilter('blocked')}
                          hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                        >
                          <Text
                            style={[styles.filterChipText, blockFilter === 'blocked' && styles.filterChipTextActive]}
                          >
                            Blocked
                          </Text>
                        </Pressable>
                        <Pressable
                          style={[styles.filterChip, blockFilter === 'unblocked' && styles.filterChipActive]}
                          onPress={() => handleBlockFilter('unblocked')}
                          hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                        >
                          <Text
                            style={[styles.filterChipText, blockFilter === 'unblocked' && styles.filterChipTextActive]}
                          >
                            Unblocked
                          </Text>
                        </Pressable>
                      </View>

                      <View style={styles.viewToggle}>
                        <Pressable
                          style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
                          onPress={() => {
                            closeDropdown();
                            setViewMode('list');
                          }}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 2 }}
                        >
                          <Ionicons
                            name="list-outline"
                            size={18}
                            color={viewMode === 'list' ? ui.brand : ui.textSecondary}
                          />
                        </Pressable>
                        <Pressable
                          style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}
                          onPress={() => {
                            closeDropdown();
                            setViewMode('grid');
                          }}
                          hitSlop={{ top: 4, bottom: 4, left: 2, right: 4 }}
                        >
                          <Ionicons
                            name="grid-outline"
                            size={18}
                            color={viewMode === 'grid' ? ui.brand : ui.textSecondary}
                          />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </Animated.View>

                {!users.length ? (
                  <View style={[styles.emptyWrap, listInsetTop > 0 ? { paddingTop: listInsetTop } : null]}>
                    <AdminEmptyState
                      title="No users found"
                      subtitle={
                        total === 0
                          ? 'Sign in with an admin account that has database access.'
                          : 'Adjust filters or search'
                      }
                      icon="👥"
                    />
                  </View>
                ) : viewMode === 'list' ? (
                  <FlatList
                    ref={listRef}
                    data={users}
                    keyExtractor={(item) => item.id}
                    renderItem={renderSubscriberRow}
                    style={styles.listBody}
                    contentContainerStyle={[
                      styles.listContent,
                      listInsetTop > 0 ? { paddingTop: listInsetTop } : null,
                    ]}
                    showsVerticalScrollIndicator
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    scrollEventThrottle={16}
                    onScroll={handleListScroll}
                    onScrollEndDrag={pinCollapseAtBottom}
                    onMomentumScrollEnd={pinCollapseAtBottom}
                    onScrollBeginDrag={() => {
                      Keyboard.dismiss();
                      closeDropdown();
                    }}
                  />
                ) : (
                  <ScrollView
                    ref={gridScrollRef}
                    style={styles.listBody}
                    contentContainerStyle={[
                      styles.grid,
                      isWide && styles.gridWide,
                      listInsetTop > 0 ? { paddingTop: listInsetTop } : null,
                    ]}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    scrollEventThrottle={16}
                    onScroll={handleListScroll}
                    onScrollEndDrag={pinCollapseAtBottom}
                    onMomentumScrollEnd={pinCollapseAtBottom}
                    onScrollBeginDrag={() => {
                      Keyboard.dismiss();
                      closeDropdown();
                    }}
                  >
                    {users.map(renderGridCard)}
                  </ScrollView>
                )}
              </View>

              <View style={styles.footer}>
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </View>
            </AdminWebLayout>
          </KeyboardDismissView>
        </KeyboardAvoidingView>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  canvas: { backgroundColor: ui.bg, flex: 1 },
  page: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: ui.pagePad,
    paddingTop: 12,
    paddingBottom: 16,
    gap: ui.sectionGap,
    overflow: 'visible',
  },
  headerShell: {
    zIndex: 20,
    elevation: 20,
    gap: ui.sectionGap,
  },
  actionCard: {
    backgroundColor: ui.card,
    borderRadius: ui.radiusHero,
    padding: ui.cardPad,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ui.border,
    ...ui.shadow,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchWrap: {
    flex: 1,
    height: ui.searchH,
    borderRadius: ui.radiusSm,
    backgroundColor: ui.searchFill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchBarContainer: { flex: 1, height: '100%' },
  searchInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    padding: 0,
    paddingRight: 28,
    fontSize: 15,
    fontWeight: '500',
    color: ui.text,
    height: ui.searchH,
  },
  addBtn: {
    height: ADD_BTN_H,
    paddingHorizontal: 18,
    borderRadius: ui.btnRadius,
    backgroundColor: ui.brand,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 96,
  },
  addBtnPressed: { opacity: 0.92 },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ui.border,
    gap: 16,
  },
  summaryBlock: { flex: 1, gap: 4 },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: ui.border,
    alignSelf: 'stretch',
  },
  summaryEyebrow: {
    fontSize: 11,
    fontWeight: '500',
    color: ui.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '700',
    color: ui.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  summaryValueSm: {
    fontSize: 22,
    fontWeight: '700',
    color: ui.text,
    fontVariant: ['tabular-nums'],
    lineHeight: 26,
  },
  summaryValueMuted: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.textSecondary,
  },
  summaryInsight: {
    fontSize: 12,
    fontWeight: '500',
    color: ui.warning,
    marginTop: 2,
  },
  planFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECE9FD',
    borderRadius: ui.radiusSm,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  planFilterText: { fontSize: 13, color: ui.brand, fontWeight: '600', flex: 1 },
  planFilterClear: { fontSize: 13, color: ui.brand, fontWeight: '700' },
  listStage: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    zIndex: 1,
  },
  filtersFloat: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 8,
    elevation: 8,
  },
  filtersCard: {
    backgroundColor: ui.card,
    borderRadius: ui.radiusMd,
    padding: ui.compactPad,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ui.border,
    ...ui.shadow,
  },
  filtersEyebrow: {
    fontSize: 11,
    fontWeight: '500',
    color: ui.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  filtersLeft: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  dropdownWrap: { position: 'relative', zIndex: 1 },
  dropdownWrapOpen: { zIndex: 300 },
  filterChip: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    borderRadius: ui.radiusPill,
    backgroundColor: ui.searchFill,
    maxWidth: 200,
  },
  filterChipActive: { backgroundColor: '#ECE9FD' },
  filterChipText: { fontSize: 13, fontWeight: '500', color: ui.textSecondary },
  filterChipTextActive: { color: ui.brand, fontWeight: '600' },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: -ui.pagePad,
    right: -ui.pagePad,
    bottom: -800,
    zIndex: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 6,
    minWidth: 168,
    backgroundColor: ui.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ui.border,
    borderRadius: ui.radiusSm,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 24,
    zIndex: 2,
    overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 11, minHeight: ui.touch },
  dropdownItemActive: { backgroundColor: ui.pressed },
  dropdownItemText: { fontSize: 14, color: ui.text, fontWeight: '500' },
  dropdownItemTextActive: { color: ui.brand, fontWeight: '600' },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: ui.searchFill,
    borderRadius: ui.radiusSm,
    padding: 3,
    gap: 2,
  },
  viewBtn: {
    width: 36,
    height: 36,
    borderRadius: ui.radiusTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtnActive: { backgroundColor: ui.card },
  listBody: { flex: 1, minHeight: 0, zIndex: 0 },
  listContent: { gap: 10, paddingBottom: 4 },
  subscriberRow: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: ui.card,
    borderRadius: ui.radiusMd,
    padding: ui.compactPad,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ui.border,
    ...ui.shadow,
  },
  subscriberRowPressed: { backgroundColor: ui.pressed },
  subscriberMain: { flex: 1, minWidth: 0, gap: 3 },
  subscriberTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  subscriberName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
    letterSpacing: -0.2,
  },
  subscriberHandle: {
    fontSize: 13,
    fontWeight: '500',
    color: ui.textSecondary,
  },
  subscriberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  subscriberMetaText: {
    fontSize: 13,
    fontWeight: '500',
    color: ui.textSecondary,
    flexShrink: 1,
  },
  subscriberMetaDot: {
    fontSize: 13,
    color: ui.textSecondary,
  },
  subscriberFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  subscriberCity: {
    fontSize: 12,
    fontWeight: '500',
    color: ui.textSecondary,
    flexShrink: 1,
  },
  planBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: ui.radiusPill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: 140,
  },
  planBadgeText: { fontSize: 12, fontWeight: '600', color: ui.brand },
  grid: { gap: 10, paddingBottom: 4 },
  gridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCard: {
    width: '100%',
    backgroundColor: ui.card,
    borderRadius: ui.radiusMd,
    padding: ui.cardPad,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ui.border,
    ...ui.shadow,
  },
  gridCardWide: {
    width: '48%',
  },
  gridCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  gridCardMeta: { flex: 1, minWidth: 0, gap: 2 },
  gridDetail: { fontSize: 13, fontWeight: '500', color: ui.textSecondary },
  gridBadges: { flexDirection: 'row', gap: 8, marginTop: 4 },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 200,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 4,
    width: '100%',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PAGE_BTN_GAP,
    width: '100%',
    maxWidth: '100%',
  },
  pageNavBtn: {
    flexShrink: 0,
  },
  pageScroll: {
    flex: 1,
    minWidth: 0,
  },
  pageScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PAGE_BTN_GAP,
    paddingHorizontal: 2,
  },
  pageBtn: {
    width: PAGE_BTN_SIZE,
    height: PAGE_BTN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ui.radiusSm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ui.border,
    backgroundColor: ui.card,
    flexShrink: 0,
  },
  pageBtnActive: { backgroundColor: ui.brand, borderColor: ui.brand },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 13, color: ui.text, fontWeight: '600', fontVariant: ['tabular-nums'] },
  pageBtnTextActive: { color: '#FFFFFF' },
});
