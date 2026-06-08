import React from 'react';
import { StyleSheet, Text } from 'react-native';
import type { LeaveRequest } from '@prime/types';
import { StatusChip, colors } from '@prime/ui';

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
