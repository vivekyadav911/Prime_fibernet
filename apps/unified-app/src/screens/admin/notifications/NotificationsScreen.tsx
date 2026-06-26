import { useCallback, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Animated,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@prime/ui';

import {
  DraftCard,
  NotificationCard,
  NotificationFilterSheet,
} from '@/components/Notifications';
import { AdminEmptyState, RoleGuard, SearchBar } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useNotificationHub } from '@/hooks/useNotificationHub';
import {
  deleteDraft,
  deleteFromHistory,
  resendNotification,
} from '@/services/broadcastNotificationService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminNotificationsStackParamList } from '@/types/navigation';
import type { AppNotification } from '@/types/notifications';

type Props = NativeStackScreenProps<AdminNotificationsStackParamList, 'NotificationList'>;

const SORT_OPTIONS = [
  { value: 'newest' as const, label: '⬇ Newest' },
  { value: 'oldest' as const, label: '⬆ Oldest' },
  { value: 'title_az' as const, label: 'AZ Title (A-Z)' },
];

export function NotificationsScreen({ navigation, route }: Props) {
  const initialTab = route.params?.initialTab ?? 'sent';
  const {
    drafts,
    sentHistory,
    sentCount,
    draftCount,
    filters,
    updateFilters,
    resetFilters,
    setTab,
    activeFilterCount,
    loading,
    refreshing,
    onRefresh,
    error,
    reload,
  } = useNotificationHub(initialTab);

  const [filterOpen, setFilterOpen] = useState(false);
  const fabExpanded = useRef(new Animated.Value(1)).current;
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const admin = { id: user?.id ?? 'admin', name: user?.name ?? 'Admin' };

  const onScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const y = e.nativeEvent.contentOffset.y;
      Animated.timing(fabExpanded, {
        toValue: y > 60 ? 0 : 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    },
    [fabExpanded],
  );

  const handleLongPress = useCallback(
    (item: AppNotification) => {
      const options = ['Resend', 'Copy as New', 'Delete from History', 'Cancel'];
      const run = async (index: number) => {
        if (index === 0) {
          try {
            await resendNotification(item.id, admin);
            dispatch(enqueueToast({ id: `resend-${Date.now()}`, type: 'success', message: 'Notification resent' }));
            reload();
          } catch (e) {
            Alert.alert('Failed', e instanceof Error ? e.message : 'Could not resend');
          }
        } else if (index === 1) {
          navigation.navigate('CreateNotification', { mode: 'create', prefill: {
            title: item.title,
            message: item.message,
            priority: item.priority,
            eventType: item.eventType,
            audience: {
              type: item.audience.type,
              planId: item.audience.planId,
              planName: item.audience.planName,
              area: item.audience.area,
              userIds: item.audience.userIds,
              userNames: item.audience.userNames,
            },
            schedule: { isScheduled: false, scheduledAt: null, timezone: item.schedule.timezone },
            tags: item.tags,
            deepLinkUrl: item.deepLinkUrl ?? '',
            imageUrl: item.imageUrl ?? '',
            templateId: null,
          } });
        } else if (index === 2) {
          Alert.alert(
            'Delete from history?',
            'This will only remove the record from your console. Notifications already delivered to users cannot be recalled.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  void deleteFromHistory(item.id).then(reload);
                },
              },
            ],
          );
        }
      };

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options, destructiveButtonIndex: 2, cancelButtonIndex: 3 },
          (i) => void run(i),
        );
      } else {
        Alert.alert('Actions', undefined, [
          { text: 'Resend', onPress: () => void run(0) },
          { text: 'Copy as New', onPress: () => void run(1) },
          { text: 'Delete', style: 'destructive', onPress: () => void run(2) },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
    },
    [admin, dispatch, navigation, reload],
  );

  const renderDraft = useCallback(
    ({ item }: { item: AppNotification }) => (
      <DraftCard
        draft={item}
        onPress={() => navigation.navigate('CreateNotification', { mode: 'edit', notificationId: item.id })}
        onEdit={() => navigation.navigate('CreateNotification', { mode: 'edit', notificationId: item.id })}
        onDelete={() => {
          Alert.alert('Delete draft?', undefined, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => void deleteDraft(item.id).then(reload),
            },
          ]);
        }}
      />
    ),
    [navigation, reload],
  );

  const renderSent = useCallback(
    ({ item }: { item: AppNotification }) => (
      <NotificationCard
        notification={item}
        onPress={() => navigation.navigate('NotificationDetail', { notificationId: item.id })}
        onLongPress={() => handleLongPress(item)}
      />
    ),
    [navigation, handleLongPress],
  );

  const fabWidth = fabExpanded.interpolate({ inputRange: [0, 1], outputRange: [56, 120] });

  if (loading) {
    return (
      <RoleGuard requiredPermission="notifications.view">
        <Screen style={adminScreenStyles.canvas} padded={false}>
          <SkeletonLoader rows={6} shape="card" />
        </Screen>
      </RoleGuard>
    );
  }

  if (error) {
    return (
      <RoleGuard requiredPermission="notifications.view">
        <Screen style={adminScreenStyles.canvas} padded={false}>
          <ErrorState message={error} onRetry={onRefresh} />
        </Screen>
      </RoleGuard>
    );
  }

  const isDrafts = filters.tab === 'drafts';
  const data = isDrafts ? drafts : sentHistory;

  return (
    <RoleGuard requiredPermission="notifications.view">
      <Screen style={adminScreenStyles.canvas} padded={false}>
        <View style={styles.searchRow}>
          <SearchBar
            value={filters.searchQuery}
            onChangeText={(q) => updateFilters({ searchQuery: q })}
            placeholder="Search sent history by title, body, or audience..."
            containerStyle={styles.search}
          />
          <Pressable style={styles.filterBtn} onPress={() => setFilterOpen(true)}>
            <Ionicons name="options-outline" size={22} color={colors.textPrimary} />
            {activeFilterCount > 0 ? <View style={styles.filterDot} /> : null}
          </Pressable>
        </View>

        <View style={styles.sortRow}>
          <Ionicons name="swap-vertical" size={16} color={colors.textSecondary} />
          <Text style={styles.sortLabel}>Sort By</Text>
          {SORT_OPTIONS.map((opt) => {
            const active = filters.sortBy === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.sortPill, active && styles.sortPillActive]}
                onPress={() => updateFilters({ sortBy: opt.value })}
              >
                {active ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
                <Text style={[styles.sortPillText, active && styles.sortPillTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, isDrafts && styles.tabActive]}
            onPress={() => setTab('drafts')}
          >
            <Text style={[styles.tabText, isDrafts && styles.tabTextActive]}>✉ Drafts</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, !isDrafts && styles.tabActiveSent]}
            onPress={() => setTab('sent')}
          >
            <Text style={[styles.tabText, !isDrafts && styles.tabTextActive]}>
              🕐 Sent History ({sentCount})
            </Text>
          </Pressable>
        </View>

        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={isDrafts ? renderDraft : renderSent}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={data.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={
            <AdminEmptyState
              title={isDrafts ? 'No drafts saved' : 'No notifications sent yet'}
              iconName={isDrafts ? 'mail-outline' : 'notifications-outline'}
              actionLabel="Create Notification"
              onAction={() => navigation.navigate('CreateNotification', { mode: 'create' })}
            />
          }
        />

        <Animated.View style={[styles.fab, { width: fabWidth }]}>
          <Pressable
            style={styles.fabInner}
            onPress={() => navigation.navigate('CreateNotification', { mode: 'create' })}
          >
            <Ionicons name="add" size={28} color={colors.white} />
            <Animated.Text style={[styles.fabLabel, { opacity: fabExpanded }]}>
              New
            </Animated.Text>
          </Pressable>
        </Animated.View>

        <NotificationFilterSheet
          visible={filterOpen}
          filters={filters}
          onClose={() => setFilterOpen(false)}
          onApply={(f) => {
            updateFilters(f);
            setFilterOpen(false);
          }}
          onClear={() => {
            resetFilters();
            setFilterOpen(false);
          }}
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  search: { flex: 1 },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: adminColors.primary,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sortLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginRight: spacing.xs },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: colors.surfaceWhite,
  },
  sortPillActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  sortPillText: { fontSize: 13, color: '#374151' },
  sortPillTextActive: { color: colors.white, fontWeight: '600' },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surfaceWhite,
  },
  tabActive: { backgroundColor: colors.surfaceWhite },
  tabActiveSent: { backgroundColor: '#3B3F8C' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: colors.white },
  listContent: { paddingBottom: 100 },
  emptyContainer: { flexGrow: 1 },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
  },
  fabInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  fabLabel: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
