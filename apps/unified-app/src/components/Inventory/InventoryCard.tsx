import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { InventoryItem } from '@/types/inventory';

import { StockStatusBadge } from './StockStatusBadge';

type InventoryCardProps = {
  item: InventoryItem;
  onPress: (item: InventoryItem) => void;
};

export function InventoryCard({ item, onPress }: InventoryCardProps) {
  return (
    <Pressable style={styles.card} onPress={() => onPress(item)}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        <StockStatusBadge status={item.stockStatus} />
      </View>
      <Text style={styles.sku}>{item.sku || 'No SKU'}</Text>
      <View style={styles.badges}>
        <View style={[styles.badge, styles.totalBadge]}>
          <Text style={[styles.badgeText, { color: '#3B82F6' }]}>Total: {item.totalQuantity}</Text>
        </View>
        <View style={[styles.badge, styles.availableBadge]}>
          <Text style={[styles.badgeText, { color: '#10B981' }]}>Available: {item.availableQuantity}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    margin: spacing.xs,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    elevation: 1,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.xs },
  name: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  sku: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xxs },
  badges: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, flexWrap: 'wrap' },
  badge: { borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 4 },
  totalBadge: { backgroundColor: '#EFF6FF' },
  availableBadge: { backgroundColor: '#F0FDF4' },
  badgeText: { fontSize: 13, fontWeight: '600' },
  footer: { alignItems: 'flex-end', marginTop: spacing.xs },
});
