import React from 'react';

import { AdminButton } from '@/components/admin';
import { StyleSheet, Text, View } from 'react-native';
import type { ServiceRequest } from '@prime/types';
import { StatusChip } from '@prime/ui';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type AdminRequestRowProps = {
  request: ServiceRequest;
  canAssign: boolean;
  onAssign: (requestId: string) => void;
  onEscalate: (requestId: string) => void;
};

export const AdminRequestRow = React.memo(function AdminRequestRow({
  request,
  canAssign,
  onAssign,
  onEscalate,
}: AdminRequestRowProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.type}>{request.requestType}</Text>
      <Text style={styles.address}>{request.address}</Text>
      <View style={styles.chips}>
        <StatusChip status={request.status} />
        <StatusChip status={request.priority} />
        {request.officerId ? null : <Text style={styles.unassigned}>Unassigned</Text>}
      </View>
      <View style={styles.actions}>
        <AdminButton label="Assign" variant="secondary" onPress={() => onAssign(request.id)} disabled={!canAssign} />
        <AdminButton label="Escalate" variant="ghost" onPress={() => onEscalate(request.id)} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault, gap: spacing.xs },
  type: { textTransform: 'capitalize', fontWeight: '600', fontSize: 16 },
  address: { color: colors.textSecondary },
  chips: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  unassigned: { color: colors.warningAmber, fontSize: 12 },
  actions: { flexDirection: 'row', gap: spacing.xs },
});
