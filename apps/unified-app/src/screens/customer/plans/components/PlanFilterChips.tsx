import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { signalGlass } from '@/theme/customer/signalGlass';
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
            accessibilityLabel={`Filter ${category}`}
          >
            <Text style={[styles.text, active && styles.textActive]}>{category}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: signalGlass.spacing.sm, paddingVertical: signalGlass.spacing.sm },
  chip: {
    paddingHorizontal: signalGlass.spacing.md,
    paddingVertical: signalGlass.spacing.sm,
    borderRadius: signalGlass.radius.pill,
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
    backgroundColor: signalGlass.colors.bgSurface,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: signalGlass.colors.accentPrimaryMuted,
    borderColor: signalGlass.colors.accentPrimary,
  },
  text: { color: signalGlass.colors.textSecondary, fontSize: 13, fontWeight: '500' },
  textActive: { color: signalGlass.colors.accentGlow, fontWeight: '700' },
});
