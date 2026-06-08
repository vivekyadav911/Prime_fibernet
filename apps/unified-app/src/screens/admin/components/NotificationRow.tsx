import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusChip } from '@prime/ui';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type NotificationHistoryItem = {
  id: string;
  title: string;
  audience: string;
  sentCount: number;
  status: string;
};

type NotificationRowProps = {
  notification: NotificationHistoryItem;
};

export const NotificationRow = React.memo(function NotificationRow({ notification }: NotificationRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.notifTitle}>{notification.title}</Text>
        <Text style={styles.meta}>{notification.audience} · Sent: {notification.sentCount}</Text>
      </View>
      <StatusChip status={notification.status} />
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault, alignItems: 'center' },
  info: { flex: 1 },
  notifTitle: { fontWeight: '600' },
  meta: { color: colors.textSecondary, fontSize: 12 },
});
