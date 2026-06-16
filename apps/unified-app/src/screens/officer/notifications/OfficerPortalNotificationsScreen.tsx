import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@prime/ui';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { usePortalNotifications } from '@/hooks/usePortalNotifications';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

export function OfficerPortalNotificationsScreen() {
  const { notifications, isLoading, isError, error, refetch, markRead, markAllRead } =
    usePortalNotifications();

  const onPress = useCallback(
    async (id: string, isRead: boolean) => {
      if (!isRead) {
        await markRead(id);
      }
    },
    [markRead],
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
        <Pressable style={styles.markAll} onPress={() => void markAllRead()}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </Pressable>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState title="No notifications" subtitle="Assignment and payment alerts appear here." />
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, !item.is_read && styles.cardUnread]}
            onPress={() => void onPress(item.id, item.is_read)}
          >
            <Text style={styles.title}>{item.title}</Text>
            {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
            <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  markAll: { padding: spacing.xs },
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
  title: { fontWeight: '700', color: colors.textPrimary },
  body: { color: colors.textSecondary },
  time: { fontSize: 12, color: colors.textSecondary },
});
