import { StyleSheet, View } from 'react-native';

import { SelectField } from '@/components/admin';
import { spacing } from '@/theme/spacing';
import type { InventoryCategory, InventoryFilters, StockStatus } from '@/types/inventory';

type FilterBarProps = {
  categories: InventoryCategory[];
  filters: InventoryFilters;
  onFiltersChange: (filters: InventoryFilters) => void;
};

const STATUS_OPTIONS: { value: StockStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
];

export function FilterBar({ categories, filters, onFiltersChange }: FilterBarProps) {
  const categoryOptions = [
    { value: 'all', label: 'All' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <View style={styles.row}>
      <View style={styles.half}>
        <SelectField
          label="Category"
          value={filters.categoryId ?? 'all'}
          options={categoryOptions}
          onSelect={(v) =>
            onFiltersChange({
              ...filters,
              categoryId: v === 'all' ? null : v,
            })
          }
        />
      </View>
      <View style={styles.half}>
        <SelectField
          label="Status"
          value={filters.stockStatus ?? 'all'}
          options={STATUS_OPTIONS}
          onSelect={(v) =>
            onFiltersChange({
              ...filters,
              stockStatus: v === 'all' ? null : (v as StockStatus),
            })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  half: { flex: 1 },
});
