import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export type OfficerPinStatus = 'checked_in_inside' | 'checked_in_outside' | 'not_checked_in' | 'offline';

type Props = {
  status: OfficerPinStatus;
  label?: string;
};

const STATUS_COLORS: Record<OfficerPinStatus, string> = {
  checked_in_inside: colors.successGreen,
  checked_in_outside: colors.warningAmber,
  not_checked_in: colors.errorRed,
  offline: colors.textSecondary,
};

const STATUS_LABELS: Record<OfficerPinStatus, string> = {
  checked_in_inside: 'Checked in · inside zone',
  checked_in_outside: 'Checked in · outside zone',
  not_checked_in: 'Not checked in',
  offline: 'Offline',
};

export const OfficerStatusBadge = memo(function OfficerStatusBadge({ status, label }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: STATUS_COLORS[status] }]}>
      <Text style={styles.text}>{label ?? STATUS_LABELS[status]}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: { color: colors.white, fontSize: 11, fontWeight: '600' },
});
