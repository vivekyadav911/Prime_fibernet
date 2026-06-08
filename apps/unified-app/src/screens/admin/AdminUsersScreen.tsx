import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Screen, colors } from '@prime/ui';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { useBlockUserMutation, useGetAllUsersQuery, useUnblockUserMutation } from '@/store/api/endpoints';
import { queryErrorMessage } from '@/utils/queryError';

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
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.email} · {item.role}</Text>
                {item.isBlocked ? <Text style={styles.blocked}>Blocked</Text> : null}
              </View>
              {item.isBlocked ? (
                <Button label="Unblock" variant="secondary" onPress={() => { unblockUser(item.id); refetch(); }} />
              ) : (
                <Button
                  label="Block"
                  variant="ghost"
                  onPress={() => {
                    if (blockReason.length < 3) return;
                    blockUser({ userId: item.id, reason: blockReason });
                    refetch();
                  }}
                />
              )}
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { margin: 12, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 8, padding: 10 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: colors.borderDefault },
  name: { fontWeight: '600' },
  meta: { color: colors.textSecondary, fontSize: 12 },
  blocked: { color: colors.errorRed, fontSize: 12 },
});
