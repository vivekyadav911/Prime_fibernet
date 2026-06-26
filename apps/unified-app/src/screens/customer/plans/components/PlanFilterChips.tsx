import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';
import type { PlanFilterCategory } from '@/utils/planTier';

type PlanFilterChipsProps = {
  categories: readonly PlanFilterCategory[];
  selected: PlanFilterCategory;
  onSelect: (category: PlanFilterCategory) => void;
};

export function PlanFilterChips({ categories, selected, onSelect }: PlanFilterChipsProps) {
  const styles = useThemedStyles(createStyles);

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

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    row: { gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
    chip: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      backgroundColor: theme.colors.bgSurface,
      minHeight: 44,
      justifyContent: 'center',
    },
    chipActive: {
      backgroundColor: theme.colors.accentPrimaryMuted,
      borderColor: theme.colors.accentPrimary,
    },
    text: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '500' },
    textActive: { color: theme.colors.accentGlow, fontWeight: '700' },
  });
