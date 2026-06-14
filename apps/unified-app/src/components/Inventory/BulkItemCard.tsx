import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { InventoryItem } from '@/types/inventory';

type BulkItemCardProps = {
  item: InventoryItem;
  isSelected: boolean;
  onToggle: (id: string) => void;
};

export function BulkItemCard({ item, isSelected, onToggle }: BulkItemCardProps) {
  return (
    <Pressable style={styles.card} onPress={() => onToggle(item.id)}>
      <Ionicons
        name={isSelected ? 'checkbox' : 'square-outline'}
        size={22}
        color={isSelected ? adminColors.primary : colors.textMuted}
      />
      <View style={styles.content}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.sku}>{item.sku || 'No SKU'}</Text>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: '#EFF6FF' }]}>
            <Text style={[styles.badgeText, { color: '#3B82F6' }]}>Total: {item.totalQuantity}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: '#F0FDF4' }]}>
            <Text style={[styles.badgeText, { color: '#10B981' }]}>Available: {item.availableQuantity}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    gap: spacing.md,
  },
  content: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  sku: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  badges: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  badge: { borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { fontSize: 13, fontWeight: '600' },
});
