import { useCallback, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
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
import type { AdminUserListItem } from '@/types/api/admin';
import type { AdminUsersStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminUsersStackParamList, 'UserList'>;

type ViewMode = 'list' | 'grid';
type CityFilter = 'all' | string;
type StatusFilter = 'all' | 'active' | 'blocked' | 'expired';
type BlockFilter = 'all' | 'blocked' | 'unblocked';

const PAGE_SIZE = 50;

function PlanBadge({ label }: { label: string }) {
  return (
    <View style={styles.planBadge}>
      <Text style={styles.planBadgeText}>{label}</Text>
    </View>
  );
}

function FilterDropdown<T extends string>({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onSelect: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value)?.label ?? value;

  return (
    <View style={styles.dropdownWrap}>
      <Pressable style={styles.dropdown} onPress={() => setOpen((o) => !o)}>
        <Text style={styles.dropdownLabel}>
          {label}: <Text style={styles.dropdownValue}>{selected}</Text>
        </Text>
        <Text style={styles.dropdownCaret}>▾</Text>
      </Pressable>
      {open ? (
        <View style={styles.dropdownMenu}>
          {options.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.dropdownItem, value === opt.value && styles.dropdownItemActive]}
              onPress={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
            >
              <Text style={[styles.dropdownItemText, value === opt.value && styles.dropdownItemTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
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
  const pages = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const set = new Set<number>([1, totalPages, page, page - 1, page + 1]);
    const sorted = [...set].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
    const result: (number | '…')[] = [];
    sorted.forEach((p, idx) => {
      if (idx > 0 && p - (sorted[idx - 1] ?? 0) > 1) result.push('…');
      result.push(p);
    });
    return result;
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <View style={styles.pagination}>
      <Pressable
        style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
        disabled={page <= 1}
        onPress={() => onPageChange(page - 1)}
      >
        <Text style={styles.pageBtnText}>‹</Text>
      </Pressable>
      {pages.map((p, idx) =>
        p === '…' ? (
          <Text key={`ellipsis-${idx}`} style={styles.pageEllipsis}>
            …
          </Text>
        ) : (
          <Pressable
            key={p}
            style={[styles.pageBtn, page === p && styles.pageBtnActive]}
            onPress={() => onPageChange(p)}
          >
            <Text style={[styles.pageBtnText, page === p && styles.pageBtnTextActive]}>{p}</Text>
          </Pressable>
        ),
      )}
      <Pressable
        style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
        disabled={page >= totalPages}
        onPress={() => onPageChange(page + 1)}
      >
        <Text style={styles.pageBtnText}>›</Text>
      </Pressable>
    </View>
  );
}

function UsersTable({
  users,
  isWide,
  onView,
}: {
  users: AdminUserListItem[];
  isWide: boolean;
  onView: (userId: string) => void;
}) {
  return (
    <ScrollView
      style={styles.listBody}
      contentContainerStyle={styles.listBodyContent}
      nestedScrollEnabled
      showsVerticalScrollIndicator
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScrollBeginDrag={Keyboard.dismiss}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={!isWide} nestedScrollEnabled>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colId]}># ID</Text>
            <Text style={[styles.tableHeaderCell, styles.colName]}>Name</Text>
            <Text style={[styles.tableHeaderCell, styles.colPhone]}>Phone</Text>
            <Text style={[styles.tableHeaderCell, styles.colPlan]}>Plan</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
            <Text style={[styles.tableHeaderCell, styles.colCity]}>City</Text>
            <Text style={[styles.tableHeaderCell, styles.colActions]}>Actions</Text>
          </View>
          {users.map((row) => (
            <Pressable key={row.id} style={styles.tableRow} onPress={() => onView(row.id)}>
              <Text style={[styles.colId, styles.idText]}>{row.legacyUserId ?? '—'}</Text>
              <View style={[styles.colName, styles.nameCell]}>
                <AvatarIcon name={row.name} size={36} />
                <View style={styles.nameInfo}>
                  <Text style={styles.nameText}>{row.name}</Text>
                  {row.username ? <Text style={styles.usernameText}>@{row.username}</Text> : null}
                </View>
              </View>
              <Text style={[styles.colPhone, styles.cellText]}>{row.phone ?? '—'}</Text>
              <View style={styles.colPlan}>
                <PlanBadge label={row.planName} />
              </View>
              <View style={styles.colStatus}>
                <StatusBadge status={row.status} />
              </View>
              <Text style={[styles.colCity, styles.cellText]}>{row.city ?? '—'}</Text>
              <Pressable style={styles.colActions} onPress={() => onView(row.id)}>
                <Text style={styles.viewLink}>View</Text>
              </Pressable>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

export function UserListScreen({ navigation }: Props) {
  const canCreateUser = useAdminPermission('users.create');
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const [search, setSearch] = useState('');
  const [city, setCity] = useState<CityFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [blockFilter, setBlockFilter] = useState<BlockFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, isError, error, refetch } = useGetAdminUsersQuery({
    page,
    limit: PAGE_SIZE,
    search,
    city: city === 'all' ? undefined : city,
    status,
    blockFilter,
  });

  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const cities = data?.cities ?? [];

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
    },
    [resetPage],
  );

  const handleStatus = useCallback(
    (value: StatusFilter) => {
      setStatus(value);
      resetPage();
    },
    [resetPage],
  );

  const handleBlockFilter = useCallback(
    (value: BlockFilter) => {
      setBlockFilter((prev) => (prev === value ? 'all' : value));
      resetPage();
    },
    [resetPage],
  );

  const handleViewUser = useCallback(
    (userId: string) => navigation.navigate('UserDetail', { userId }),
    [navigation],
  );

  const renderGridCard = useCallback(
    (item: AdminUserListItem) => (
      <Pressable
        key={item.id}
        style={styles.gridCard}
        onPress={() => navigation.navigate('UserDetail', { userId: item.id })}
      >
        <View style={styles.gridCardHeader}>
          <AvatarIcon name={item.name} size={44} />
          <View style={styles.gridCardMeta}>
            <Text style={styles.nameText}>{item.name}</Text>
            {item.username ? <Text style={styles.usernameText}>@{item.username}</Text> : null}
          </View>
        </View>
        <Text style={styles.gridDetail}>ID: {item.legacyUserId ?? '—'}</Text>
        <Text style={styles.gridDetail}>{item.phone ?? '—'}</Text>
        <Text style={styles.gridDetail}>{item.city ?? '—'}</Text>
        <View style={styles.gridBadges}>
          <PlanBadge label={item.planName} />
          <StatusBadge status={item.status} />
        </View>
      </Pressable>
    ),
    [navigation],
  );

  if (isLoading) {
    return (
      <Screen style={styles.canvas}>
        <SkeletonLoader rows={10} showAvatar />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen style={styles.canvas}>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <RoleGuard requiredPermission="users.view">
      <Screen padded={false} style={styles.canvas}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          <KeyboardDismissView style={styles.content}>
            <AdminWebLayout>
            <View style={styles.card}>
            <View style={styles.searchRow}>
              <View style={styles.searchWrap}>
                <Text style={styles.searchIcon}>🔍</Text>
                <SearchBar
                  value={search}
                  onChangeText={handleSearch}
                  placeholder="Search users by name, email, phone, or ID..."
                />
              </View>
              {canCreateUser ? (
                <Pressable
                  style={styles.addBtn}
                  onPress={() => navigation.navigate('AddUser')}
                >
                  <Text style={styles.addBtnText}>+ Add New</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.statsRow}>
              <Text style={styles.statsText}>
                Total Users: <Text style={styles.statsBold}>{total.toLocaleString()}</Text>
              </Text>
              <Text style={styles.statsMuted}>
                Showing {users.length} of {total.toLocaleString()} users
                {isFetching ? ' · Updating…' : ''}
              </Text>
            </View>

            <View style={styles.filtersRow}>
              <View style={styles.filtersLeft}>
                <FilterDropdown label="City" value={city} options={cityOptions} onSelect={handleCity} />
                <FilterDropdown label="Status" value={status} options={statusOptions} onSelect={handleStatus} />
                <Pressable
                  style={[styles.filterChip, blockFilter === 'blocked' && styles.filterChipActive]}
                  onPress={() => handleBlockFilter('blocked')}
                >
                  <Text style={[styles.filterChipText, blockFilter === 'blocked' && styles.filterChipTextActive]}>
                    Blocked
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.filterChip, blockFilter === 'unblocked' && styles.filterChipActive]}
                  onPress={() => handleBlockFilter('unblocked')}
                >
                  <Text style={[styles.filterChipText, blockFilter === 'unblocked' && styles.filterChipTextActive]}>
                    Unblocked
                  </Text>
                </Pressable>
              </View>

              <View style={styles.viewToggle}>
                <Pressable
                  style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
                  onPress={() => setViewMode('list')}
                >
                  <Text style={styles.viewBtnText}>☰</Text>
                </Pressable>
                <Pressable
                  style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}
                  onPress={() => setViewMode('grid')}
                >
                  <Text style={styles.viewBtnText}>▦</Text>
                </Pressable>
              </View>
            </View>

            {!users.length ? (
              <AdminEmptyState
                title="No users found"
                subtitle={total === 0 ? 'Sign in with an admin account that has database access.' : 'Adjust filters or search'}
                icon="👥"
              />
            ) : viewMode === 'list' ? (
              <UsersTable users={users} isWide={isWide} onView={handleViewUser} />
            ) : (
              <ScrollView
                style={styles.listBody}
                contentContainerStyle={styles.grid}
                nestedScrollEnabled
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                onScrollBeginDrag={Keyboard.dismiss}
              >
                {users.map(renderGridCard)}
              </ScrollView>
            )}

            <View style={styles.footer}>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </View>
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
  canvas: { backgroundColor: adminColors.canvasBg, flex: 1 },
  content: { padding: spacing.md, flex: 1, minHeight: 0 },
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
    flex: 1,
    minHeight: 0,
  },
  listBody: { flex: 1, minHeight: 0 },
  listBodyContent: { flexGrow: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  searchIcon: { fontSize: 16, opacity: 0.5 },
  addBtn: {
    backgroundColor: adminColors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  statsText: { fontSize: 14, color: colors.textPrimary },
  statsBold: { fontWeight: '700' },
  statsMuted: { fontSize: 13, color: colors.textSecondary },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  filtersLeft: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, flex: 1 },
  dropdownWrap: { position: 'relative', zIndex: 10 },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceWhite,
  },
  dropdownLabel: { fontSize: 13, color: colors.textSecondary },
  dropdownValue: { color: colors.textPrimary, fontWeight: '600' },
  dropdownCaret: { fontSize: 10, color: colors.textSecondary },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    minWidth: 160,
    backgroundColor: colors.surfaceWhite,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.md,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 20,
  },
  dropdownItem: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  dropdownItemActive: { backgroundColor: adminColors.primaryTint },
  dropdownItemText: { fontSize: 13, color: colors.textPrimary },
  dropdownItemTextActive: { color: adminColors.primary, fontWeight: '600' },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceWhite,
  },
  filterChipActive: { borderColor: adminColors.primary, backgroundColor: adminColors.primaryTint },
  filterChipText: { fontSize: 13, color: colors.textSecondary },
  filterChipTextActive: { color: adminColors.primary, fontWeight: '600' },
  viewToggle: { flexDirection: 'row', borderWidth: 1, borderColor: colors.borderDefault, borderRadius: radius.md },
  viewBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  viewBtnActive: { backgroundColor: adminColors.primaryTint },
  viewBtnText: { fontSize: 16, color: colors.textSecondary },
  table: { minWidth: '100%' },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  tableHeaderCell: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  colId: { width: 80 },
  colName: { width: 260 },
  colPhone: { width: 130 },
  colPlan: { width: 100 },
  colStatus: { width: 90 },
  colCity: { width: 120 },
  colActions: { width: 70 },
  idText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  nameCell: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nameInfo: { flex: 1, gap: 2 },
  nameText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  usernameText: { fontSize: 12, color: colors.textSecondary },
  cellText: { fontSize: 13, color: colors.textPrimary },
  planBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  planBadgeText: { fontSize: 12, fontWeight: '600', color: '#0284C7' },
  viewLink: { fontSize: 13, fontWeight: '600', color: adminColors.primary },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
  },
  gridCard: {
    width: 240,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.surfaceWhite,
  },
  gridCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  gridCardMeta: { flex: 1 },
  gridDetail: { fontSize: 12, color: colors.textSecondary },
  gridBadges: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.borderDefault,
  },
  pagination: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  pageBtn: {
    minWidth: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  pageBtnActive: { backgroundColor: adminColors.primary, borderColor: adminColors.primary },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
  pageBtnTextActive: { color: colors.white },
  pageEllipsis: { paddingHorizontal: spacing.xs, color: colors.textSecondary },
});
