import React from 'react';
import { StyleSheet, Text } from 'react-native';
import type { Shift } from '@prime/types';
import { StatusChip } from '@prime/ui';
import { colors } from '@/theme/colors';

type ShiftRowProps = {
  shift: Shift;
};

export const ShiftRow = React.memo(function ShiftRow({ shift }: ShiftRowProps) {
  return (
    <Text style={styles.historyRow}>
      {shift.shiftDate} — <StatusChip status={shift.status} />
    </Text>
  );
});

const styles = StyleSheet.create({
  historyRow: { paddingVertical: 6, color: colors.textSecondary },
});
