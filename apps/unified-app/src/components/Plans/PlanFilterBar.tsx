import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { PlanFilters } from '@/types/plans';
import { formatINR } from '@/utils/planUtils';

type PlanFilterBarProps = {
  filters: PlanFilters;
  shownCount: number;
  onRemoveFilter: (key: keyof PlanFilters | 'speed' | 'price') => void;
  onOpenSheet: (section?: string) => void;
};

type ChipProps = {
  label: string;
  color: string;
  onPress: () => void;
  onRemove: () => void;
};

function FilterChip({ label, color, onPress, onRemove }: ChipProps) {
  return (
    <Pressable style={[styles.chip, { backgroundColor: color }]} onPress={onPress}>
      <Text style={styles.chipText}>{label}</Text>
      <Pressable onPress={onRemove} hitSlop={8}>
        <Ionicons name="close" size={14} color={colors.white} />
      </Pressable>
    </Pressable>
  );
}

export function PlanFilterBar({ filters, shownCount, onRemoveFilter, onOpenSheet }: PlanFilterBarProps) {
  const chips: { key: keyof PlanFilters | 'speed' | 'price'; label: string; color: string; section: string }[] = [];

  if (filters.status !== 'all') {
    chips.push({
      key: 'status',
      label: `Status: ${filters.status === 'active' ? 'Active' : 'Inactive'}`,
      color: '#10B981',
      section: 'status',
    });
  }
  if (filters.speedMin != null || filters.speedMax != null) {
    chips.push({
      key: 'speed',
      label: `Speed: ${filters.speedMin ?? 0}-${filters.speedMax ?? '∞'} Mbps`,
      color: '#3B82F6',
      section: 'speed',
    });
  }
  if (filters.priceMin != null || filters.priceMax != null) {
    chips.push({
      key: 'price',
      label: `Price: ${formatINR(filters.priceMin ?? 0)}-${filters.priceMax != null ? formatINR(filters.priceMax) : '∞'}`,
      color: '#8B5CF6',
      section: 'price',
    });
  }
  if (filters.category !== 'all') {
    chips.push({
      key: 'category',
      label: `Category: ${filters.category.charAt(0).toUpperCase()}${filters.category.slice(1)}`,
      color: '#6366F1',
      section: 'category',
    });
  }
  if (filters.validityDays != null) {
    chips.push({
      key: 'validityDays',
      label: `Validity: ${filters.validityDays} days`,
      color: '#F59E0B',
      section: 'validity',
    });
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {chips.map((chip) => (
          <FilterChip
            key={chip.key}
            label={chip.label}
            color={chip.color}
            onPress={() => onOpenSheet(chip.section)}
            onRemove={() => onRemoveFilter(chip.key)}
          />
        ))}
        <Pressable style={styles.filterBtn} onPress={() => onOpenSheet()}>
          <Ionicons name="options-outline" size={18} color={adminColors.primary} />
        </Pressable>
      </View>
      <Text style={styles.count}>{shownCount} plans shown</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.sm, marginBottom: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
  },
  chipText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  filterBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: adminColors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xxs },
});
