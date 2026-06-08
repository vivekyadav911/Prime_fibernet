import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, TextInput } from 'react-native';
import type { AuditLog } from '@prime/types';
import { Screen, colors } from '@prime/ui';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { useGetAuditLogsQuery } from '@/store/api/endpoints';
import { queryErrorMessage } from '@/utils/queryError';

import { AuditLogRow } from './components/AuditLogRow';

export function AdminAuditScreen() {
  const [actionFilter, setActionFilter] = useState('');
  const { data, isLoading, isError, error, refetch } = useGetAuditLogsQuery(
    actionFilter ? { action: actionFilter } : undefined,
  );

  const keyExtractor = useCallback((item: AuditLog) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: AuditLog }) => <AuditLogRow log={item} />,
    [],
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
        <FlatList data={data} keyExtractor={keyExtractor} renderItem={renderItem} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filter: { margin: 12, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 8, padding: 10 },
});
