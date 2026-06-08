import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Payment } from '@prime/types';

import { StatusChip } from '@/components/common';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type PaymentHistoryItemProps = {
  payment: Payment;
  onDownload?: () => void;
  onRetry?: () => void;
};

export const PaymentHistoryItem = React.memo(function PaymentHistoryItem({
  payment,
  onDownload,
  onRetry,
}: PaymentHistoryItemProps) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.amount}>₹{payment.amount.toFixed(2)}</Text>
        <Text style={styles.date}>{new Date(payment.createdAt).toLocaleDateString()}</Text>
        {payment.paymentStatus === 'success' && onDownload ? (
          <Pressable onPress={onDownload}>
            <Text style={styles.link}>Download invoice</Text>
          </Pressable>
        ) : null}
        {payment.paymentStatus === 'failed' && onRetry ? (
          <Pressable onPress={onRetry}>
            <Text style={styles.retry}>Retry payment</Text>
          </Pressable>
        ) : null}
      </View>
      <StatusChip status={payment.paymentStatus} />
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  left: { flex: 1, marginRight: spacing.sm },
  amount: { fontWeight: '700', fontSize: 16, color: colors.textPrimary },
  date: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.xxs },
  link: { color: colors.accentTeal, fontSize: 12, marginTop: spacing.xs, fontWeight: '600' },
  retry: { color: colors.warningAmber, fontSize: 12, marginTop: spacing.xs, fontWeight: '600' },
});
