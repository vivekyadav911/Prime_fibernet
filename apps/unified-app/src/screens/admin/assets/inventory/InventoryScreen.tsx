import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { FormField, RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useCreateInventoryItemMutation, useGetAdminInventoryQuery } from '@/store/api/endpoints';
import type { AdminInventoryStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminInventoryStackParamList, 'InventoryList'>;

export function InventoryScreen({ navigation }: Props) {
  const { data, isLoading, isError, error, refetch } = useGetAdminInventoryQuery();
  const [create] = useCreateInventoryItemMutation();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Router');
  const [qty, setQty] = useState('1');
  const [showAdd, setShowAdd] = useState(false);

  const onAdd = async () => {
    await create({ name, category, quantity: Number(qty) });
    setShowAdd(false);
    refetch();
  };

  if (isLoading) return <Screen><SkeletonLoader rows={8} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="inventory.view">
      <Screen padded={false}>
        <View style={styles.toolbar}>
          <Button label="Add Item" onPress={() => setShowAdd(!showAdd)} />
          <Button label="Assignments" variant="ghost" onPress={() => navigation.navigate('AssignmentRequests')} />
          <Button label="History" variant="ghost" onPress={() => navigation.navigate('InventoryHistory')} />
          <Button label="Categories" variant="ghost" onPress={() => navigation.navigate('Categories')} />
          <Button label="Bulk Ops" variant="ghost" onPress={() => navigation.navigate('BulkOperations')} />
        </View>
        {showAdd ? (
          <View style={styles.addForm}>
            <FormField label="Name" value={name} onChangeText={setName} />
            <FormField label="Category" value={category} onChangeText={setCategory} />
            <FormField label="Quantity" value={qty} onChangeText={setQty} keyboardType="numeric" />
            <Button label="Save" onPress={() => void onAdd()} />
          </View>
        ) : null}
        <FlatList
          data={data ?? []}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.category} · Total {item.totalQty} · Assigned {item.assignedQty} · Available {item.availableQty}
              </Text>
            </View>
          )}
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  toolbar: { padding: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  addForm: { padding: spacing.sm },
  row: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault },
  name: { fontWeight: '600' },
  meta: { fontSize: 12, color: colors.textSecondary },
});
