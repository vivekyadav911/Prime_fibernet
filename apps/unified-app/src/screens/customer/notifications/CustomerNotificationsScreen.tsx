import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  CustomerEmptyState,
  CustomerErrorState,
  CustomerFilterChips,
  CustomerSkeletonLoader,
  CustomerToast,
  PressableScale,
} from '@/components/customer/ui';
import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { DismissKeyboardFlatList } from '@/components/common';
import { useCustomerNotifications } from '@/hooks/useCustomerNotifications';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useCustomerUiStore } from '@/store/customerUiStore';
import type { CustomerTheme } from '@/theme/customer';
import type { NotificationCategory } from '@/types/payments';
import type { CustomerStackParamList } from '@/types/navigation';
import { formatRelativeIst } from '@/utils/formatDate';

type Props = NativeStackScreenProps<CustomerStackParamList, 'Notifications'>;

const FILTERS: Array<{ id: 'all' | NotificationCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'payment', label: 'Payments' },
  { id: 'plan', label: 'Plans' },
  { id: 'ticket', label: 'Tickets' },
  { id: 'outage', label: 'Outages' },
  { id: 'promo', label: 'Promos' },
];

const FILTER_EMPTY_LABELS: Partial<Record<'all' | NotificationCategory, string>> = {
  all: 'No notifications yet',
  payment: 'No payment notifications',
  plan: 'No plan notifications',
  ticket: 'No ticket notifications',
  outage: 'No outage alerts',
  promo: 'No promotions',
};

const CATEGORY_ICONS: Record<NotificationCategory, keyof typeof MaterialCommunityIcons.glyphMap> = {
  payment: 'credit-card-outline',
  plan: 'package-variant-closed',
  ticket: 'ticket-confirmation-outline',
  request: 'file-document-outline',
  outage: 'alert-circle-outline',
  promo: 'tag-outline',
  system: 'bell-outline',
  hr: 'account-outline',
};

function categoryIcon(category: string | null | undefined): keyof typeof MaterialCommunityIcons.glyphMap {
  if (category && category in CATEGORY_ICONS) {
    return CATEGORY_ICONS[category as NotificationCategory];
  }
  return 'bell-outline';
}

export function CustomerNotificationsScreen({ navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();
  const [filter, setFilter] = useState<'all' | NotificationCategory>('all');
  const { notifications, unreadCount, isLoading, error, refetch, markAsRead, markAllAsRead } =
    useCustomerNotifications();
  const toast = useCustomerUiStore((s) => s.toast);
  const clearToast = useCustomerUiStore((s) => s.clearToast);
  const prevCountRef = useRef(notifications.length);

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications;
    return notifications.filter((n) => n.category === filter);
  }, [filter, notifications]);

  useEffect(() => {
    if (notifications.length > prevCountRef.current && prevCountRef.current > 0) {
      const latest = notifications[0];
      if (latest) {
        useCustomerUiStore.getState().showToast(latest.title, latest.body ?? undefined);
      }
    }
    prevCountRef.current = notifications.length;
  }, [notifications]);

  const filterHeader = (
    <CustomerFilterChips
      chips={FILTERS}
      selectedId={filter}
      onSelect={(id) => setFilter(id as 'all' | NotificationCategory)}
      style={styles.filterBar}
      trailingAction={
        unreadCount > 0 ? (
          <Pressable
            onPress={() => void markAllAsRead()}
            style={styles.markAllBtn}
            accessibilityLabel="Mark all as read"
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        ) : undefined
      }
    />
  );

  if (isLoading) {
    return (
      <View style={styles.canvas}>
        {filterHeader}
        <CustomerSkeletonLoader rows={5} rowHeight={64} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.canvas}>
        {filterHeader}
        <CustomerErrorState message="Could not load notifications. Try again." onRetry={refetch} />
      </View>
    );
  }

  return (
    <View style={styles.canvas}>
      <CustomerToast
        title={toast?.title ?? ''}
        body={toast?.body}
        visible={Boolean(toast)}
        onDismiss={clearToast}
      />
      <DismissKeyboardFlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={filterHeader}
        contentContainerStyle={filtered.length === 0 ? styles.listEmptyContent : styles.listContent}
        ListEmptyComponent={
          <CustomerEmptyState
            title={FILTER_EMPTY_LABELS[filter] ?? 'No notifications'}
            subtitle={
              filter === 'all'
                ? 'Updates about payments, plans, and support will appear here'
                : 'Try another filter to see more'
            }
            icon="🔔"
          />
        }
        renderItem={({ item }) => (
          <PressableScale
            style={[styles.row, !item.is_read && styles.unread]}
            onPress={() => {
              void markAsRead(item.id);
              if (item.action_url?.includes('payment')) navigation.navigate('CustomerTabs', { screen: 'Payments' });
              else if (item.action_url?.includes('tickets')) navigation.navigate('CustomerTicketList');
              else if (item.action_url?.includes('plans'))
                navigation.navigate('CustomerTabs', { screen: 'Plans' });
            }}
            accessibilityLabel={item.title}
          >
            <View style={[styles.iconWrap, !item.is_read && styles.iconWrapUnread]}>
              <MaterialCommunityIcons
                name={categoryIcon(item.category)}
                size={20}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.body}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                {!item.is_read ? <View style={styles.unreadDot} /> : null}
              </View>
              {item.body ? (
                <Text style={styles.bodyText} numberOfLines={2}>
                  {item.body}
                </Text>
              ) : null}
              <Text style={styles.time}>{formatRelativeIst(item.created_at)}</Text>
            </View>
          </PressableScale>
        )}
      />
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    canvas: { flex: 1, backgroundColor: theme.colors.bgDeep },
    filterBar: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
    },
    markAllBtn: {
      minHeight: 36,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xs,
    },
    markAllText: {
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: '600',
      fontFamily: theme.fonts.bodyMedium,
    },
    listContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    },
    listEmptyContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
      flexGrow: 1,
      justifyContent: 'flex-start',
    },
    row: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSubtle,
    },
    unread: {
      backgroundColor: theme.colors.accentPrimaryMuted,
      marginHorizontal: -theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radius.sm,
      borderBottomColor: 'transparent',
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.bgSurface,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
    },
    iconWrapUnread: {
      borderColor: theme.colors.chipActiveBorder,
    },
    body: { flex: 1, minWidth: 0 },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    title: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.bodyMedium,
      fontSize: 14,
      fontWeight: '600',
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.primary,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontFamily: theme.fonts.body,
      marginTop: 4,
      lineHeight: 18,
    },
    time: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontFamily: theme.fonts.body,
      marginTop: 4,
    },
  });
