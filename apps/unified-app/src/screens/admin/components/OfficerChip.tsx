import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { Officer } from '@prime/types';
import { colors } from '@prime/ui';

type OfficerChipProps = {
  officer: Officer;
  selected: boolean;
  onSelect: (officerId: string) => void;
};

export const OfficerChip = React.memo(function OfficerChip({ officer, selected, onSelect }: OfficerChipProps) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipActive]}
      onPress={() => onSelect(officer.id)}
    >
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{officer.name}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.borderDefault, marginRight: 8 },
  chipActive: { backgroundColor: colors.primaryNavy, borderColor: colors.primaryNavy },
  chipText: { color: colors.textPrimary, fontSize: 12 },
  chipTextActive: { color: colors.white },
});
