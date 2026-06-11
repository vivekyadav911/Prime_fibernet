import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type FilterChipsProps<T extends string> = {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
};

export function FilterChips<T extends string>({ options, selected, onSelect }: FilterChipsProps<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((opt) => {
        const active = selected === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(opt.value)}
          >
            <Text style={[styles.text, active && styles.textActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.xs, paddingVertical: spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    backgroundColor: colors.surfaceWhite,
  },
  chipActive: {
    borderColor: adminColors.primary,
    backgroundColor: adminColors.primaryTint,
  },
  text: { fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
  textActive: { color: adminColors.primary, fontWeight: '600' },
});
