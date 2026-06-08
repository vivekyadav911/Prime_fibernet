import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ServiceRequest } from '@prime/types';

import { EmptyState, StatusChip } from '@/components/common';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type RecentRequestsListProps = {
  requests: ServiceRequest[];
  onViewAll?: () => void;
  onPressRequest?: (id: string) => void;
};

const RequestRow = React.memo(function RequestRow({
  item,
  onPress,
}: {
  item: ServiceRequest;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowText}>
        <Text style={styles.type}>{item.requestType}</Text>
        <Text style={styles.address} numberOfLines={1}>
          {item.address}
        </Text>
      </View>
      <StatusChip status={item.status} />
    </Pressable>
  );
});

export function RecentRequestsList({ requests, onViewAll, onPressRequest }: RecentRequestsListProps) {
  if (!requests.length) {
    return (
      <EmptyState
        title="No recent requests"
        subtitle="Raise a service request when you need help"
        icon="🔧"
      />
    );
  }

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>Recent requests</Text>
        {onViewAll ? (
          <Text style={styles.link} onPress={onViewAll}>
            View all
          </Text>
        ) : null}
      </View>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <RequestRow item={item} onPress={() => onPressRequest?.(item.id)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  link: { color: colors.accentTeal, fontWeight: '600', fontSize: 14 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  rowText: { flex: 1, marginRight: spacing.sm },
  type: { textTransform: 'capitalize', fontWeight: '600', color: colors.textPrimary },
  address: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.xxs },
});
