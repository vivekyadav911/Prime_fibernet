import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  CustomerEmptyState,
  CustomerErrorState,
  CustomerSkeletonLoader,
  CustomerToast,
  PressableScale,
} from '@/components/customer/ui';
import { CustomerFontProvider } from '@/components/customer/CustomerFontProvider';
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

function NotificationsContent({ navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const [filter, setFilter] = useState<'all' | NotificationCategory>('all');
  const { notifications, isLoading, error, refetch, markAsRead, markAllAsRead } =
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

  if (isLoading) {
    return (
      <View style={styles.canvas}>
        <CustomerSkeletonLoader rows={5} rowHeight={64} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.canvas}>
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        keyboardShouldPersistTaps="handled"
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => setFilter(f.id)}
            style={[styles.chip, filter === f.id && styles.chipActive]}
            accessibilityLabel={`Filter ${f.label}`}
          >
            <Text style={[styles.chipText, filter === f.id && styles.chipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => void markAllAsRead()}
          style={styles.markAll}
          accessibilityLabel="Mark all as read"
        >
          <Text style={styles.markAllText}>Mark all read</Text>
        </Pressable>
      </ScrollView>
      <DismissKeyboardFlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
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
              else if (item.action_url?.includes('tickets'))
                navigation.navigate('CustomerTicketList');
              else if (item.action_url?.includes('plans'))
                navigation.navigate('CustomerTabs', { screen: 'Plans' });
            }}
            accessibilityLabel={item.title}
          >
            {!item.is_read ? <View style={styles.dot} /> : <View style={styles.dotSpacer} />}
            <View style={styles.body}>
              <Text style={styles.title}>{item.title}</Text>
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

export function CustomerNotificationsScreen(props: Props) {
  return (
    <CustomerFontProvider>
      <NotificationsContent {...props} />
    </CustomerFontProvider>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    canvas: { flex: 1, backgroundColor: theme.colors.bgDeep },
    filterRow: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
      padding: theme.spacing.lg,
      alignItems: 'center',
      paddingRight: theme.spacing.xxxl,
    },
    chip: {
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      minHeight: 44,
      justifyContent: 'center',
    },
    chipActive: {
      borderColor: theme.colors.accentPrimary,
      backgroundColor: theme.colors.accentPrimaryMuted,
    },
    chipText: { color: theme.colors.textSecondary, fontSize: 12 },
    chipTextActive: { color: theme.colors.accentGlow },
    markAll: { marginLeft: theme.spacing.sm, minHeight: 44, justifyContent: 'center' },
    markAllText: { color: theme.colors.accentGlow, fontSize: 12 },
    list: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xxxl },
    row: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSubtle,
    },
    unread: { backgroundColor: theme.colors.bgGlass },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.accentPrimary,
      marginTop: 6,
    },
    dotSpacer: { width: 8 },
    body: { flex: 1, minWidth: 0 },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.bodyMedium,
      fontSize: 14,
      fontWeight: '600',
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      marginTop: 4,
    },
    time: {
      color: theme.colors.textMuted,
      fontSize: 11,
      marginTop: 4,
    },
  });
