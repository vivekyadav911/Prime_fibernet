import React from 'react';
import { StyleSheet, Text } from 'react-native';
import type { LeaveRequest } from '@prime/types';
import { StatusChip } from '@prime/ui';
import { colors } from '@/theme/colors';

type LeaveRequestRowProps = {
  leave: LeaveRequest;
};

export const LeaveRequestRow = React.memo(function LeaveRequestRow({ leave }: LeaveRequestRowProps) {
  return (
    <Text style={styles.row}>
      {leave.leaveType} · {leave.startDate} to {leave.endDate} · <StatusChip status={leave.status} />
    </Text>
  );
});

const styles = StyleSheet.create({
  row: { paddingVertical: 8, color: colors.textSecondary },
});
