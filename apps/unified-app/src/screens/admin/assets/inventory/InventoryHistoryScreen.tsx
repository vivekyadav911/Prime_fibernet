import { FlatList, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetInventoryHistoryQuery } from '@/store/api/endpoints';
import type { AdminInventoryStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminInventoryStackParamList, 'InventoryHistory'>;

export function InventoryHistoryScreen(_props: Props) {
  const { data, isLoading, isError, error, refetch } = useGetInventoryHistoryQuery();

  if (isLoading) return <Screen><SkeletonLoader rows={8} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="inventory.view">
      <Screen padded={false}>
        <FlatList
          data={data ?? []}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <Text style={styles.row}>
              {item.itemName} · {item.action} · {item.officerName} · qty {item.quantity} · {new Date(item.date).toLocaleDateString()}
            </Text>
          )}
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  row: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault, fontSize: 13 },
});
