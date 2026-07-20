import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOfficerPullToRefresh } from '@/hooks/officer/useOfficerPullToRefresh';
import { DismissKeyboardFlatList, EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { OfficerScreen } from '@/components/officer';
import { usePortalNotifications } from '@/hooks/usePortalNotifications';
import type { PortalNotification } from '@/types/payments';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import {
  applyOfficerPortalNotificationFilters,
  countActiveOfficerNotificationFilters,
  DEFAULT_OFFICER_NOTIFICATION_FILTERS,
  formatOfficerNotificationDateLabel,
  officerNotificationEmptySubtitle,
  type OfficerNotificationFilterState,
  type OfficerNotificationSortKey,
} from '@/utils/officerPortalNotifications';
import {
  isJunkPortalNotification,
  portalNotificationCategoryLabel,
  resolveNotificationText,
} from '@/utils/portalNotificationDisplay';
import { queryErrorMessage } from '@/utils/queryError';

import { OfficerNotificationToolSheets } from './components/OfficerNotificationToolSheets';

type SheetKind = 'sort' | 'filter' | 'date';

function ToolbarIconButton({
  icon,
  label,
  active,
  badge,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.iconBtn, active && styles.iconBtnActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons
        name={icon}
        size={20}
        color={active ? colors.primaryNavy : colors.textSecondary}
      />
      {badge && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function NotificationRow({ item }: { item: PortalNotification }) {
  const unread = !item.is_read;

  return (
    <View
      style={[styles.card, unread ? styles.cardUnread : styles.cardRead]}
      accessibilityRole="text"
    >
      {unread ? <View style={styles.unreadAccent} /> : null}
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={[styles.title, unread ? styles.titleUnread : styles.titleRead]}>
            {resolveNotificationText(item.title, item.data)}
          </Text>
          {unread ? (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadPillText}>Unread</Text>
            </View>
          ) : (
            <View style={styles.readPill}>
              <Text style={styles.readPillText}>Read</Text>
            </View>
          )}
        </View>
        <View style={styles.metaRow}>
          {item.category ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {portalNotificationCategoryLabel(item.category)}
              </Text>
            </View>
          ) : null}
        </View>
        {item.body ? (
          <Text
            style={[styles.body, unread ? styles.bodyUnread : styles.bodyRead]}
            numberOfLines={3}
          >
            {resolveNotificationText(item.body, item.data)}
          </Text>
        ) : null}
        <View style={styles.cardFooter}>
          <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
          {unread ? <View style={styles.unreadDot} /> : null}
        </View>
      </View>
    </View>
  );
}

export function OfficerPortalNotificationsScreen() {
  const [filters, setFilters] = useState<OfficerNotificationFilterState>(
    DEFAULT_OFFICER_NOTIFICATION_FILTERS,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [openSheet, setOpenSheet] = useState<SheetKind | null>(null);
  const { notifications, isLoading, isError, error, refetch, markAllRead } =
    usePortalNotifications(100);
  const { refreshControl } = useOfficerPullToRefresh(refetch);

  const productionCount = useMemo(
    () => notifications.filter((n) => !isJunkPortalNotification(n)).length,
    [notifications],
  );

  const filtered = useMemo(
    () => applyOfficerPortalNotificationFilters(notifications, { ...filters, searchQuery }),
    [filters, notifications, searchQuery],
  );

  const unreadInView = useMemo(() => filtered.filter((n) => !n.is_read).length, [filtered]);

  const sortActive = filters.sortKey !== 'newest';
  const filterActive = filters.categoryFilter !== 'all' || filters.readFilter !== 'all';
  const dateActive = Boolean(filters.dateFrom || filters.dateTo);
  const activeCount = countActiveOfficerNotificationFilters(filters, searchQuery);

  const renderItem = useCallback(
    ({ item }: { item: PortalNotification }) => <NotificationRow item={item} />,
    [],
  );

  const listHeader = (
    <View style={styles.header}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search notifications…"
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <ToolbarIconButton
          icon="swap-vertical-outline"
          label="Sort notifications"
          active={sortActive}
          badge={sortActive ? 1 : 0}
          onPress={() => setOpenSheet('sort')}
        />
        <ToolbarIconButton
          icon="options-outline"
          label="Filter notifications"
          active={filterActive}
          badge={filterActive ? 1 : 0}
          onPress={() => setOpenSheet('filter')}
        />
        <ToolbarIconButton
          icon="calendar-outline"
          label="Date range"
          active={dateActive}
          badge={dateActive ? 1 : 0}
          onPress={() => setOpenSheet('date')}
        />
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryText}>
            {filtered.length} shown
            {unreadInView > 0 ? ` · ${unreadInView} unread` : ''}
          </Text>
          {dateActive ? (
            <Text style={styles.dateHint}>
              {formatOfficerNotificationDateLabel(filters.dateFrom, filters.dateTo)}
            </Text>
          ) : null}
        </View>
        {unreadInView > 0 ? (
          <Pressable style={styles.markAll} onPress={() => void markAllRead()} hitSlop={8}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        ) : null}
      </View>

      {activeCount > 0 ? (
        <Pressable
          style={styles.clearFilters}
          onPress={() => {
            setFilters(DEFAULT_OFFICER_NOTIFICATION_FILTERS);
            setSearchQuery('');
          }}
        >
          <Text style={styles.clearFiltersText}>Clear all ({activeCount})</Text>
        </Pressable>
      ) : null}
    </View>
  );

  if (isLoading) {
    return (
      <OfficerScreen onRefresh={refetch}>
        <SkeletonLoader rows={6} />
      </OfficerScreen>
    );
  }

  if (isError) {
    return (
      <OfficerScreen onRefresh={refetch}>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </OfficerScreen>
    );
  }

  return (
    <OfficerScreen scrollable={false} padded={false}>
      <DismissKeyboardFlatList
        refreshControl={refreshControl}
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <EmptyState
            title="No notifications"
            subtitle={officerNotificationEmptySubtitle(
              { ...filters, searchQuery },
              productionCount > 0,
            )}
          />
        }
        renderItem={renderItem}
      />

      <OfficerNotificationToolSheets
        openSheet={openSheet}
        filters={filters}
        onClose={() => setOpenSheet(null)}
        onApply={setFilters}
        onSortSelect={(sortKey: OfficerNotificationSortKey) =>
          setFilters((prev) => ({ ...prev, sortKey }))
        }
      />
    </OfficerScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    marginBottom: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    color: colors.textPrimary,
    fontSize: 15,
    minHeight: 48,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    borderColor: colors.primaryNavy,
    backgroundColor: colors.background,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primaryNavy,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryCol: { flex: 1, gap: spacing.xxs },
  summaryText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dateHint: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  markAll: { minHeight: 48, justifyContent: 'center' },
  markAllText: { color: colors.primaryNavy, fontWeight: '600', fontSize: 13 },
  clearFilters: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
  },
  clearFiltersText: {
    color: colors.primaryNavy,
    fontWeight: '600',
    fontSize: 13,
  },
  list: { padding: spacing.md, paddingBottom: spacing.xxxl },
  card: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  cardUnread: {
    borderColor: colors.primaryNavy,
    backgroundColor: colors.background,
  },
  cardRead: {
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
    opacity: 0.92,
  },
  unreadAccent: {
    width: 4,
    backgroundColor: colors.primaryNavy,
  },
  cardContent: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: { flex: 1, fontSize: 15 },
  titleUnread: { fontWeight: '700', color: colors.textPrimary },
  titleRead: { fontWeight: '500', color: colors.textSecondary },
  unreadPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.primaryNavy,
  },
  unreadPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'uppercase',
  },
  readPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  readPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  body: { fontSize: 14, lineHeight: 20 },
  bodyUnread: { color: colors.textPrimary },
  bodyRead: { color: colors.textSecondary },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xxs,
  },
  time: { fontSize: 12, color: colors.textSecondary },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryNavy,
  },
});
