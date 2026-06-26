import { useCallback } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import {
  useGetFaqCategoriesQuery,
  useUpsertFaqCategoryMutation,
} from '@/services/api/adminSupportApi';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminSupportStackParamList } from '@/types/navigation';
import type { FaqCategory } from '@/types/support';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminSupportStackParamList, 'FaqCategories'>;

export function FaqCategoriesScreen({}: Props) {
  const { data: categories, isLoading, isError, error, refetch } = useGetFaqCategoriesQuery();
  const [upsertCategory] = useUpsertFaqCategoryMutation();

  const handleAdd = useCallback(() => {
    Alert.prompt('New Category', 'Enter category name', async (name) => {
      if (!name?.trim()) return;
      const slug = name.trim().toLowerCase().replace(/\s+/g, '-');
      await upsertCategory({ name: name.trim(), slug, sortOrder: (categories?.length ?? 0) + 1 });
    });
  }, [categories, upsertCategory]);

  const renderItem = useCallback(
    ({ item }: { item: FaqCategory }) => (
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: item.color }]} />
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.order}>#{item.sortOrder}</Text>
      </View>
    ),
    [],
  );

  if (isLoading) return <Screen><SkeletonLoader rows={5} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="settings.view">
      <Screen style={adminScreenStyles.canvas}>
        <FlatList
          data={categories ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListFooterComponent={
            <Pressable style={styles.addBtn} onPress={handleAdd}>
              <Text style={styles.addText}>+ Add Category</Text>
            </Pressable>
          }
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceWhite,
    padding: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.sm,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  order: { fontSize: 12, color: colors.textSecondary },
  addBtn: { padding: spacing.md, alignItems: 'center' },
  addText: { fontSize: 14, fontWeight: '600', color: adminColors.primary },
});
