import React from 'react';
import { StyleSheet, Text } from 'react-native';
import type { AuditLog } from '@prime/types';
import { StatusChip, colors } from '@prime/ui';

type AuditLogRowProps = {
  log: AuditLog;
};

export const AuditLogRow = React.memo(function AuditLogRow({ log }: AuditLogRowProps) {
  return (
    <Text style={styles.row}>
      {new Date(log.timestamp).toLocaleString()} · {log.action} · {log.targetEntity ?? '—'}{' '}
      {log.status ? <StatusChip status={log.status.toLowerCase()} /> : null}
    </Text>
  );
});

const styles = StyleSheet.create({
  row: { padding: 12, borderBottomWidth: 1, borderColor: colors.borderDefault, fontSize: 13 },
});
