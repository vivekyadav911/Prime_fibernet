import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { PlanFilterCategory } from '@/utils/planTier';

type PlanFilterChipsProps = {
  categories: readonly PlanFilterCategory[];
  selected: PlanFilterCategory;
  onSelect: (category: PlanFilterCategory) => void;
};

export function PlanFilterChips({ categories, selected, onSelect }: PlanFilterChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {categories.map((category) => {
        const active = category === selected;
        return (
          <Pressable
            key={category}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(category)}
          >
            <Text style={[styles.text, active && styles.textActive]}>{category}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  chipActive: { backgroundColor: colors.primaryNavy, borderColor: colors.primaryNavy },
  text: { color: colors.textPrimary, fontSize: 13, fontWeight: '500' },
  textActive: { color: colors.white, fontWeight: '700' },
});
