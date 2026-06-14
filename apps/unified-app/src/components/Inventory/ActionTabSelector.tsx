import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type ActionTabSelectorProps = {
  selected: 'sold' | 'damaged' | 'returned' | 'add_stock';
  availableQty: number;
  assignedQty: number;
  onSelect: (action: 'sold' | 'damaged' | 'returned' | 'add_stock') => void;
  showAddStock?: boolean;
};

export function ActionTabSelector({
  selected,
  availableQty,
  assignedQty,
  onSelect,
  showAddStock = false,
}: ActionTabSelectorProps) {
  const tabs: { key: 'sold' | 'damaged' | 'returned' | 'add_stock'; label: string; disabled: boolean }[] = [
    ...(showAddStock
      ? [{ key: 'add_stock' as const, label: `Add Stock (${availableQty})`, disabled: false }]
      : []),
    { key: 'sold', label: `Sold (${availableQty})`, disabled: availableQty === 0 },
    { key: 'damaged', label: `Damaged (${availableQty})`, disabled: availableQty === 0 },
    { key: 'returned', label: `Returned (${assignedQty})`, disabled: assignedQty === 0 },
  ];

  return (
    <View style={styles.row}>
      {tabs.map((tab) => {
        const isActive = selected === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={[
              styles.pill,
              isActive && styles.pillActive,
              tab.disabled && styles.pillDisabled,
            ]}
            onPress={() => !tab.disabled && onSelect(tab.key)}
            disabled={tab.disabled}
          >
            <Text
              style={[
                styles.pillText,
                isActive && styles.pillTextActive,
                tab.disabled && styles.pillTextDisabled,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pill: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceWhite,
  },
  pillActive: { borderWidth: 2, borderColor: '#374151' },
  pillDisabled: { opacity: 0.4 },
  pillText: { fontSize: 14, color: colors.textSecondary },
  pillTextActive: { color: colors.textPrimary, fontWeight: '700' },
  pillTextDisabled: { color: colors.textMuted },
});
