import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import type { DateRangeKey } from '../hooks/usePayments';

const OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: '30d', label: '30 days' },
  { key: '3m', label: '3 months' },
  { key: '6m', label: '6 months' },
  { key: 'all', label: 'All' },
];

type DateRangeChipsProps = {
  selected: DateRangeKey;
  onSelect: (key: DateRangeKey) => void;
};

export function DateRangeChips({ selected, onSelect }: DateRangeChipsProps) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((option) => {
        const active = option.key === selected;
        return (
          <Pressable
            key={option.key}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(option.key)}
          >
            <Text style={[styles.text, active && styles.textActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingHorizontal: spacing.md },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  chipActive: { backgroundColor: colors.primaryNavy, borderColor: colors.primaryNavy },
  text: { fontSize: 12, color: colors.textPrimary },
  textActive: { color: colors.white, fontWeight: '600' },
});
