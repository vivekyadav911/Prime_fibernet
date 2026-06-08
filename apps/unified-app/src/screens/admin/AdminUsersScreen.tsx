import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput } from 'react-native';
import type { UserProfile } from '@prime/types';
import { Screen, colors } from '@prime/ui';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { useBlockUserMutation, useGetAllUsersQuery, useUnblockUserMutation } from '@/store/api/endpoints';
import { queryErrorMessage } from '@/utils/queryError';

import { UserRow } from './components/UserRow';

export function AdminUsersScreen() {
  const { data, isLoading, isError, error, refetch } = useGetAllUsersQuery();
  const [blockUser] = useBlockUserMutation();
  const [unblockUser] = useUnblockUserMutation();
  const [search, setSearch] = useState('');
  const [blockReason, setBlockReason] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return data ?? [];
    const q = search.toLowerCase();
    return (data ?? []).filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [data, search]);

  const canBlock = blockReason.length >= 3;

  const handleBlock = useCallback(
    (userId: string) => {
      if (!canBlock) return;
      blockUser({ userId, reason: blockReason });
      refetch();
    },
    [blockReason, blockUser, canBlock, refetch],
  );

  const handleUnblock = useCallback(
    (userId: string) => {
      unblockUser(userId);
      refetch();
    },
    [refetch, unblockUser],
  );

  const keyExtractor = useCallback((item: UserProfile) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: UserProfile }) => (
      <UserRow user={item} canBlock={canBlock} onBlock={handleBlock} onUnblock={handleUnblock} />
    ),
    [canBlock, handleBlock, handleUnblock],
  );

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={6} showAvatar />
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

  if (!data?.length) {
    return (
      <Screen>
        <EmptyState title="No users found" subtitle="Try adjusting your filters" icon="👥" />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <TextInput style={styles.search} placeholder="Search users…" value={search} onChangeText={setSearch} />
      <TextInput style={styles.search} placeholder="Block reason (required to block)" value={blockReason} onChangeText={setBlockReason} />
      {!filtered.length ? (
        <EmptyState title="No users found" subtitle="Try adjusting your filters" icon="🔍" />
      ) : (
        <FlatList data={filtered} keyExtractor={keyExtractor} renderItem={renderItem} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { margin: 12, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 8, padding: 10 },
});
