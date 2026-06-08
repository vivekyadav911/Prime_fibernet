import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ServiceRequest } from '@prime/types';
import { Button } from '@prime/ui';

import { PriorityBadge, StatusChip } from '@/components/common';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type RequestListItemProps = {
  request: ServiceRequest;
  onPress?: () => void;
  onCancel?: () => void;
};

export const RequestListItem = React.memo(function RequestListItem({
  request,
  onPress,
  onCancel,
}: RequestListItemProps) {
  const canCancel = request.status === 'pending';

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.type}>{request.requestType}</Text>
        <StatusChip status={request.status} />
      </View>
      <Text style={styles.address} numberOfLines={2}>
        {request.address}
      </Text>
      <View style={styles.footer}>
        <PriorityBadge priority={request.priority} />
        <Text style={styles.date}>{new Date(request.createdAt).toLocaleDateString()}</Text>
      </View>
      {canCancel && onCancel ? (
        <Button label="Cancel request" variant="secondary" onPress={onCancel} style={styles.cancel} />
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { textTransform: 'capitalize', fontWeight: '700', color: colors.textPrimary, fontSize: 16 },
  address: { color: colors.textSecondary, marginTop: spacing.xs, fontSize: 13 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  date: { color: colors.textSecondary, fontSize: 12 },
  cancel: { marginTop: spacing.sm },
});
