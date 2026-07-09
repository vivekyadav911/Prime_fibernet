import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@prime/ui';

import { DismissKeyboardFlatList, EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { usePortalNotifications } from '@/hooks/usePortalNotifications';
import type { PortalNotification } from '@/types/payments';
import type { OfficerDrawerParamList } from '@/types/navigation';
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

function isSignContractNotification(item: PortalNotification): boolean {
  const action = item.data?.action;
  return action === 'sign_contract' || item.category === 'hr';
}

function isCollectionNotification(item: PortalNotification): boolean {
  return item.category === 'payment' || item.type === 'assignment' || item.type === 'claim';
}

export function OfficerPortalNotificationsScreen() {
  const navigation = useNavigation<DrawerNavigationProp<OfficerDrawerParamList>>();
  const [filters, setFilters] = useState<OfficerNotificationFilterState>(
    DEFAULT_OFFICER_NOTIFICATION_FILTERS,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [openSheet, setOpenSheet] = useState<SheetKind | null>(null);
  const { notifications, isLoading, isError, error, refetch, markRead, markAllRead } =
    usePortalNotifications(100);

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

  const onPress = useCallback(
    async (item: PortalNotification) => {
      if (!item.is_read) {
        await markRead(item.id);
      }

      if (isSignContractNotification(item)) {
        navigation.getParent()?.navigate('ProfileStack', {
          screen: 'EmploymentContract',
          params: { highlightSign: true },
        });
        return;
      }

      if (isCollectionNotification(item)) {
        navigation.getParent()?.navigate('CollectionsStack', { screen: 'CollectionsList' });
        return;
      }

      if (item.category === 'ticket' || item.category === 'request') {
        navigation.dispatch(DrawerActions.jumpTo('RequestsStack'));
      }
    },
    [markRead, navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: PortalNotification }) => (
      <Pressable
        style={[styles.card, !item.is_read && styles.cardUnread]}
        onPress={() => void onPress(item)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{resolveNotificationText(item.title, item.data)}</Text>
          {item.category ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {portalNotificationCategoryLabel(item.category)}
              </Text>
            </View>
          ) : null}
        </View>
        {item.body ? (
          <Text style={styles.body} numberOfLines={3}>
            {resolveNotificationText(item.body, item.data)}
          </Text>
        ) : null}
        <View style={styles.cardFooter}>
          <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
          {!item.is_read ? <View style={styles.unreadDot} /> : null}
        </View>
      </Pressable>
    ),
    [onPress],
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
        <Pressable style={styles.markAll} onPress={() => void markAllRead()} hitSlop={8}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </Pressable>
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
      <Screen>
        <SkeletonLoader rows={6} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <DismissKeyboardFlatList
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
    </Screen>
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
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  cardUnread: { borderColor: colors.primaryNavy, backgroundColor: colors.background },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: { flex: 1, fontWeight: '700', color: colors.textPrimary, fontSize: 15 },
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
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
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
