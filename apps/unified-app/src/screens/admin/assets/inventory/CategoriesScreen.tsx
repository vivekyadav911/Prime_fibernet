import { useState } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { FormField, RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useCreateInventoryCategoryMutation, useGetInventoryCategoriesQuery } from '@/store/api/endpoints';
import type { AdminInventoryStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminInventoryStackParamList, 'Categories'>;

export function CategoriesScreen(_props: Props) {
  const { data, isLoading, isError, error, refetch } = useGetInventoryCategoriesQuery();
  const [create] = useCreateInventoryCategoryMutation();
  const [name, setName] = useState('');

  const onAdd = async () => {
    if (!name) return;
    await create({ name });
    setName('');
    refetch();
  };

  if (isLoading) return <Screen><SkeletonLoader rows={6} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="inventory.edit">
      <Screen padded={false}>
        <FormField label="New category" value={name} onChangeText={setName} />
        <Button label="Add category" onPress={() => void onAdd()} />
        <FlatList
          data={data ?? []}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <Text style={styles.row}>{item.name}</Text>}
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  row: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault, fontWeight: '600' },
});
