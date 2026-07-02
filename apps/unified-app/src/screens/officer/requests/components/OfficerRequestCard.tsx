import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ServiceRequest } from '@prime/types';
import { Button, StatusChip } from '@prime/ui';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type OfficerRequestCardProps = {
  request: ServiceRequest;
  advanceLabel?: string;
  onPress: (requestId: string) => void;
  onAdvance?: (requestId: string, status: string) => void;
};

export const OfficerRequestCard = React.memo(function OfficerRequestCard({
  request,
  advanceLabel,
  onPress,
  onAdvance,
}: OfficerRequestCardProps) {
  return (
    <Pressable style={styles.card} onPress={() => onPress(request.id)}>
      <View style={styles.header}>
        <Text style={styles.type}>{request.requestTypeLabel ?? request.requestType}</Text>
        <StatusChip status={request.priority} />
      </View>
      <Text style={styles.address}>{request.address}</Text>
      <StatusChip status={request.status} />
      {advanceLabel && onAdvance ? (
        <Button
          label={advanceLabel}
          onPress={() => onAdvance(request.id, request.status)}
          style={styles.btn}
        />
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault, gap: spacing.xs },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { textTransform: 'capitalize', fontWeight: '600', fontSize: 16 },
  address: { color: colors.textSecondary },
  btn: { marginTop: 8 },
});
