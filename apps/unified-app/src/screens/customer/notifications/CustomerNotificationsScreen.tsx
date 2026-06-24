import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { CustomerBadge, CustomerSkeletonLoader } from '@/components/customer/ui';
import { CustomerFontProvider } from '@/components/customer/CustomerFontProvider';
import { ErrorState } from '@/components/common';
import { useCustomerNotifications } from '@/hooks/useCustomerNotifications';
import { signalGlass } from '@/theme/customer/signalGlass';
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

function NotificationsContent({ navigation }: Props) {
  const [filter, setFilter] = useState<'all' | NotificationCategory>('all');
  const { notifications, isLoading, error, refetch, markAsRead, markAllAsRead } =
    useCustomerNotifications();

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications;
    return notifications.filter((n) => n.category === filter);
  }, [filter, notifications]);

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
        <ErrorState message="Could not load notifications" onRetry={refetch} />
      </View>
    );
  }

  return (
    <View style={styles.canvas}>
      <View style={styles.filterRow}>
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
        <Pressable onPress={() => void markAllAsRead()} style={styles.markAll}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </Pressable>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No notifications yet</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.row, !item.is_read && styles.unread]}
            onPress={() => {
              void markAsRead(item.id);
              if (item.action_url?.includes('payment')) navigation.navigate('CustomerTabs', { screen: 'Payments' });
              else if (item.action_url?.includes('tickets'))
                navigation.navigate('CustomerTicketList');
              else if (item.action_url?.includes('plans'))
                navigation.navigate('CustomerTabs', { screen: 'Plans' });
            }}
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
          </Pressable>
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

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: signalGlass.colors.bgDeep },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: signalGlass.spacing.xs,
    padding: signalGlass.spacing.lg,
    alignItems: 'center',
  },
  chip: {
    borderRadius: signalGlass.radius.pill,
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
    paddingHorizontal: signalGlass.spacing.sm,
    paddingVertical: signalGlass.spacing.xs,
  },
  chipActive: {
    borderColor: signalGlass.colors.accentPrimary,
    backgroundColor: 'rgba(59,130,246,0.15)',
  },
  chipText: { color: signalGlass.colors.textSecondary, fontSize: 12 },
  chipTextActive: { color: signalGlass.colors.accentGlow },
  markAll: { marginLeft: 'auto' },
  markAllText: { color: signalGlass.colors.accentGlow, fontSize: 12 },
  list: { paddingHorizontal: signalGlass.spacing.lg, paddingBottom: signalGlass.spacing.xxxl },
  row: {
    flexDirection: 'row',
    gap: signalGlass.spacing.sm,
    paddingVertical: signalGlass.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: signalGlass.colors.borderSubtle,
  },
  unread: { backgroundColor: signalGlass.colors.bgGlass },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: signalGlass.colors.accentPrimary,
    marginTop: 6,
  },
  dotSpacer: { width: 8 },
  body: { flex: 1 },
  title: {
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.bodyMedium,
    fontSize: 14,
    fontWeight: '600',
  },
  bodyText: {
    color: signalGlass.colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  time: {
    color: signalGlass.colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  empty: {
    color: signalGlass.colors.textSecondary,
    textAlign: 'center',
    marginTop: signalGlass.spacing.xxxl,
  },
});
