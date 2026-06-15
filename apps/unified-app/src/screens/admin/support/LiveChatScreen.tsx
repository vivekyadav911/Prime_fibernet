import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { formatDistanceToNow } from 'date-fns';
import { Screen } from '@prime/ui';

import { AgentStatusToggle } from '@/components/support';
import { RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useAgentAvailability } from '@/hooks/useAgentAvailability';
import { useOfficerId } from '@/hooks/useOfficerId';
import { useChatSession } from '@/hooks/useChatSession';
import { acceptChatSession } from '@/services/chatService';
import { useAppSelector } from '@/store/hooks';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminSupportStackParamList } from '@/types/navigation';
import type { ChatSession } from '@/types/support';

type Props = NativeStackScreenProps<AdminSupportStackParamList, 'LiveChat'>;
type QueueTab = 'waiting' | 'active' | 'resolved';

const TABS: { value: QueueTab; label: string }[] = [
  { value: 'waiting', label: 'Waiting' },
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
];

export function LiveChatScreen({ navigation }: Props) {
  const [tab, setTab] = useState<QueueTab>('waiting');
  const authUserId = useAppSelector((s) => s.auth.user?.id ?? null);
  const officerId = useOfficerId();
  const userName = useAppSelector((s) => s.auth.user?.name ?? 'Agent');
  const { status, updateStatus, loading: statusLoading } = useAgentAvailability(authUserId);
  const { sessions, loading, error, reload } = useChatSession(
    tab === 'active' && officerId ? { agentId: officerId } : tab === 'waiting' ? { status: 'waiting' } : { status: 'resolved' },
  );

  const filtered = useMemo(() => {
    if (tab === 'waiting') return sessions.filter((s) => s.status === 'waiting');
    if (tab === 'active') return sessions.filter((s) => s.status === 'active');
    return sessions.filter((s) => s.status === 'resolved');
  }, [sessions, tab]);

  const handleAccept = useCallback(
    async (session: ChatSession) => {
      if (!authUserId) return;
      await acceptChatSession(session.id, authUserId, userName);
      await reload();
      navigation.navigate('ChatConversation', { sessionId: session.id });
    },
    [authUserId, userName, reload, navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatSession }) => (
      <Pressable
        style={styles.sessionCard}
        onPress={() => {
          if (item.status === 'waiting') void handleAccept(item);
          else navigation.navigate('ChatConversation', { sessionId: item.id });
        }}
      >
        <Text style={styles.customerName} numberOfLines={1}>
          {item.customerName}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.accountNumber ? `${item.accountNumber} · ` : ''}
          {formatDistanceToNow(new Date(item.startedAt), { addSuffix: true })}
        </Text>
        <Text style={styles.channel}>{item.channel}</Text>
      </Pressable>
    ),
    [handleAccept, navigation],
  );

  if (loading) {
    return (
      <Screen safeAreaTop={false}>
        <SkeletonLoader rows={6} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen safeAreaTop={false}>
        <ErrorState message={error} onRetry={reload} />
      </Screen>
    );
  }

  return (
    <RoleGuard requiredPermission="settings.view">
      <Screen style={styles.screen} padded={false} safeAreaTop={false}>
        <View style={styles.container}>
          <View style={styles.toolbar}>
            <AgentStatusToggle status={status} onChange={updateStatus} loading={statusLoading} />
            <View style={styles.tabs}>
              {TABS.map((t) => (
                <Pressable
                  key={t.value}
                  style={[styles.tab, tab === t.value && styles.tabActive]}
                  onPress={() => setTab(t.value)}
                >
                  <Text style={[styles.tabText, tab === t.value && styles.tabTextActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <FlatList
            style={styles.list}
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.empty}>No chats in this queue</Text>
            }
          />
        </View>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: adminColors.canvasBg, flex: 1 },
  container: { flex: 1 },
  toolbar: {
    padding: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    backgroundColor: adminColors.canvasBg,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.borderDefault,
  },
  tabActive: { backgroundColor: adminColors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
  tabTextActive: { color: colors.white },
  list: { flex: 1 },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  sessionCard: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  customerName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  channel: { fontSize: 11, color: adminColors.primary, marginTop: 4 },
  empty: { textAlign: 'center', color: colors.textSecondary, padding: spacing.xl },
});
