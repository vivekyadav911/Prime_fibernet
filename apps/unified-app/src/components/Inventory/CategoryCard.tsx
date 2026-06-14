import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { InventoryCategory } from '@/types/inventory';

type CategoryCardProps = {
  category: InventoryCategory;
  onEdit: (category: InventoryCategory) => void;
  onDelete: (category: InventoryCategory) => void;
};

export function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  const iconName = category.iconName as keyof typeof Ionicons.glyphMap;
  const canDelete = category.itemCount === 0;

  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: category.iconBgColor }]}>
        <Ionicons name={iconName} size={22} color={category.iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={styles.name}>{category.name}</Text>
        {category.description ? (
          <Text style={styles.description} numberOfLines={2}>{category.description}</Text>
        ) : null}
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{category.itemCount} Items</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable onPress={() => onEdit(category)} hitSlop={8}>
          <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
        </Pressable>
        {canDelete ? (
          <Pressable onPress={() => onDelete(category)} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color={colors.errorRed} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    elevation: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  description: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  countBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: spacing.xs,
  },
  countText: { fontSize: 11, color: colors.textPrimary, fontWeight: '500' },
  actions: { gap: spacing.sm, alignItems: 'center' },
});
