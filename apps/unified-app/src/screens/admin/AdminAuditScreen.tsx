import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput } from 'react-native';
import { Screen, StatusChip, colors } from '@prime/ui';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { useGetAuditLogsQuery } from '@/store/api/endpoints';
import { queryErrorMessage } from '@/utils/queryError';

export function AdminAuditScreen() {
  const [actionFilter, setActionFilter] = useState('');
  const { data, isLoading, isError, error, refetch } = useGetAuditLogsQuery(
    actionFilter ? { action: actionFilter } : undefined,
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

  return (
    <Screen padded={false}>
      <TextInput
        style={styles.filter}
        placeholder="Filter by action (e.g. user_blocked)"
        value={actionFilter}
        onChangeText={setActionFilter}
      />
      {!data?.length ? (
        <EmptyState title="No audit logs" subtitle="Admin actions will be recorded here" icon="📋" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Text style={styles.row}>
              {new Date(item.timestamp).toLocaleString()} · {item.action} · {item.targetEntity ?? '—'}{' '}
              {item.status ? <StatusChip status={item.status.toLowerCase()} /> : null}
            </Text>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filter: { margin: 12, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 8, padding: 10 },
  row: { padding: 12, borderBottomWidth: 1, borderColor: colors.borderDefault, fontSize: 13 },
});
