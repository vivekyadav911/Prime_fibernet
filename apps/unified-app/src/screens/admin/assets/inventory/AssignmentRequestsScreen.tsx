import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { RoleGuard, StatusBadge } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetAssignmentRequestsQuery, useReviewAssignmentRequestMutation } from '@/store/api/endpoints';
import type { AdminInventoryStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminInventoryStackParamList, 'AssignmentRequests'>;

export function AssignmentRequestsScreen(_props: Props) {
  const { data, isLoading, isError, error, refetch } = useGetAssignmentRequestsQuery({ status: 'pending' });
  const [review] = useReviewAssignmentRequestMutation();

  if (isLoading) return <Screen><SkeletonLoader rows={6} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="inventory.edit">
      <Screen padded={false}>
        <FlatList
          data={data ?? []}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.name}>{item.officerName} → {item.itemName} ×{item.quantity}</Text>
              <StatusBadge status={item.status} />
              <View style={styles.actions}>
                <Button label="Approve" variant="secondary" onPress={() => review({ id: item.id, action: 'approve' })} />
                <Button label="Reject" variant="ghost" onPress={() => review({ id: item.id, action: 'reject' })} />
              </View>
            </View>
          )}
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  row: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault, gap: spacing.xs },
  name: { fontWeight: '600' },
  actions: { flexDirection: 'row', gap: spacing.xs },
});
