import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput } from 'react-native';
import { Screen, StatusChip, colors } from '@prime/ui';

import { useGetAuditLogsQuery } from '@/store/api/endpoints';

export function AdminAuditScreen() {
  const [actionFilter, setActionFilter] = useState('');
  const { data } = useGetAuditLogsQuery(actionFilter ? { action: actionFilter } : undefined);

  return (
    <Screen padded={false}>
      <TextInput
        style={styles.filter}
        placeholder="Filter by action (e.g. user_blocked)"
        value={actionFilter}
        onChangeText={setActionFilter}
      />
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text style={styles.row}>
            {new Date(item.timestamp).toLocaleString()} · {item.action} · {item.targetEntity ?? '—'}{' '}
            {item.status ? <StatusChip status={item.status.toLowerCase()} /> : null}
          </Text>
        )}
        ListEmptyComponent={<Text style={styles.muted}>No audit logs</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filter: { margin: 12, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 8, padding: 10 },
  row: { padding: 12, borderBottomWidth: 1, borderColor: colors.borderDefault, fontSize: 13 },
  muted: { padding: 16, color: colors.textSecondary },
});
