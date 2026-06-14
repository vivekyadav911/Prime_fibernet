import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { InventoryItem } from '@/types/inventory';
import { truncate } from '@/utils/inventoryUtils';

import { StockStatusBadge } from './StockStatusBadge';

type InventoryTableRowProps = {
  item: InventoryItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onPress: (item: InventoryItem) => void;
  onQuickAction: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
};

function availableColor(available: number, total: number): string {
  if (available === 0) return '#EF4444';
  if (available <= total * 0.2) return '#F59E0B';
  return '#10B981';
}

export function InventoryTableRow({
  item,
  isSelected,
  onSelect,
  onPress,
  onQuickAction,
  onEdit,
}: InventoryTableRowProps) {
  return (
    <Pressable style={styles.row} onPress={() => onPress(item)}>
      <Pressable style={styles.checkbox} onPress={() => onSelect(item.id)} hitSlop={8}>
        <Ionicons
          name={isSelected ? 'checkbox' : 'square-outline'}
          size={20}
          color={isSelected ? adminColors.primary : colors.textMuted}
        />
      </Pressable>
      <View style={styles.nameCol}>
        <Text style={styles.name} numberOfLines={1}>{truncate(item.name, 27)}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.categoryName}</Text>
        </View>
      </View>
      <Text style={styles.skuCol} numberOfLines={1}>{item.sku || '—'}</Text>
      <Text style={styles.qtyCol}>{item.totalQuantity}</Text>
      <Text style={[styles.qtyCol, { color: availableColor(item.availableQuantity, item.totalQuantity) }]}>
        {item.availableQuantity}
      </Text>
      <View style={styles.statusCol}>
        <StockStatusBadge status={item.stockStatus} />
      </View>
      <View style={styles.actionsCol}>
        <Pressable onPress={() => onQuickAction(item)} hitSlop={8} accessibilityLabel="Quick actions">
          <Ionicons name="flash-outline" size={22} color="#F59E0B" />
        </Pressable>
        <Pressable onPress={() => onEdit(item)} hitSlop={8}>
          <Ionicons name="create-outline" size={22} color="#3B82F6" />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    gap: spacing.xs,
  },
  checkbox: { width: 28 },
  nameCol: { flex: 2 },
  name: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginTop: 2,
  },
  categoryText: { fontSize: 12, color: adminColors.primary, fontWeight: '500' },
  skuCol: { flex: 1, fontSize: 13, color: colors.textSecondary },
  qtyCol: { width: 40, fontSize: 14, fontWeight: '500', textAlign: 'center', color: colors.textPrimary },
  statusCol: { width: 90 },
  actionsCol: { flexDirection: 'row', gap: spacing.xs, width: 56 },
});
