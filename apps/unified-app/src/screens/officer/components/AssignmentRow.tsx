import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ServiceRequest } from '@prime/types';
import { StatusChip } from '@prime/ui';

type AssignmentRowProps = {
  request: ServiceRequest;
};

export const AssignmentRow = React.memo(function AssignmentRow({ request }: AssignmentRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.capitalize}>{request.requestType}</Text>
      <StatusChip status={request.priority} />
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  capitalize: { textTransform: 'capitalize' },
});
