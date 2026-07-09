import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { Screen } from '@prime/ui';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { usePortalNotifications } from '@/hooks/usePortalNotifications';
import type { NotificationCategory, PortalNotification } from '@/types/payments';
import type { OfficerDrawerParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import {
  isJunkPortalNotification,
  portalNotificationCategoryLabel,
  resolveNotificationText,
} from '@/utils/portalNotificationDisplay';
import { queryErrorMessage } from '@/utils/queryError';

type FilterId = 'all' | NotificationCategory;

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'hr', label: 'HR' },
  { id: 'payment', label: 'Payments' },
  { id: 'ticket', label: 'Tickets' },
  { id: 'system', label: 'System' },
];

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  payment: 'Payment',
  plan: 'Plan',
  ticket: 'Ticket',
  request: 'Ticket',
  outage: 'Outage',
  promo: 'Promo',
  system: 'System',
  hr: 'HR',
};

function isSignContractNotification(item: PortalNotification): boolean {
  const action = item.data?.action;
  return action === 'sign_contract' || item.category === 'hr';
}

function isCollectionNotification(item: PortalNotification): boolean {
  return item.category === 'payment' || item.type === 'assignment' || item.type === 'claim';
}

export function OfficerPortalNotificationsScreen() {
  const navigation = useNavigation<DrawerNavigationProp<OfficerDrawerParamList>>();
  const [filter, setFilter] = useState<FilterId>('all');
  const { notifications, isLoading, isError, error, refetch, markRead, markAllRead } =
    usePortalNotifications();

  const filtered = useMemo(() => {
    const production = notifications.filter((n) => !isJunkPortalNotification(n));
    if (filter === 'all') return production;
    if (filter === 'ticket') {
      return production.filter((n) => n.category === 'ticket' || n.category === 'request');
    }
    return production.filter((n) => n.category === filter);
  }, [filter, notifications]);

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
        return;
      }
    },
    [markRead, navigation],
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
      <View style={styles.toolbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={[styles.chip, filter === f.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, filter === f.id && styles.chipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable style={styles.markAll} onPress={() => void markAllRead()}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </Pressable>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            title="No notifications"
            subtitle="Employment contract signatures, collection assignments, and payment alerts appear here."
          />
        }
        renderItem={({ item }) => (
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
              <Text style={styles.body}>{resolveNotificationText(item.body, item.data)}</Text>
            ) : null}
            <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    paddingBottom: spacing.sm,
  },
  filterRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.xs,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  chipActive: {
    borderColor: adminColors.primary,
    backgroundColor: adminColors.primaryTint,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: adminColors.primary },
  markAll: { alignSelf: 'flex-end', paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  markAllText: { color: adminColors.primary, fontWeight: '600' },
  list: { padding: spacing.md },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  cardUnread: { borderColor: adminColors.primary, backgroundColor: colors.background },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: { flex: 1, fontWeight: '700', color: colors.textPrimary },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  categoryText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' },
  body: { color: colors.textSecondary },
  time: { fontSize: 12, color: colors.textSecondary },
});
