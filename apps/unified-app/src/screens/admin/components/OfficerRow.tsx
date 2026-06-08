import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Officer } from '@prime/types';
import { Button } from '@prime/ui';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type OfficerRowProps = {
  officer: Officer;
  onSetAvailable: (officerId: string) => void;
};

export const OfficerRow = React.memo(function OfficerRow({ officer, onSetAvailable }: OfficerRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name}>{officer.name}</Text>
        <Text style={styles.meta}>{officer.email} · {officer.region ?? 'No region'}</Text>
        <Text style={styles.meta}>Status: {officer.availabilityStatus}</Text>
      </View>
      <Button label="Set available" variant="secondary" onPress={() => onSetAvailable(officer.id)} />
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault },
  info: { flex: 1 },
  name: { fontWeight: '600' },
  meta: { color: colors.textSecondary, fontSize: 12 },
});
