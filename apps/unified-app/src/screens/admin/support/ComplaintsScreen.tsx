import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { AdminScreenLayout, RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetComplaintsQuery } from '@/services/api/adminSupportApi';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminSupportStackParamList } from '@/types/navigation';
import type { CustomerComplaint } from '@/types/support';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminSupportStackParamList, 'Complaints'>;

export function ComplaintsScreen({ navigation }: Props) {
  const { data, isLoading, isError, error, refetch } = useGetComplaintsQuery();

  const renderItem = useCallback(
    ({ item }: { item: CustomerComplaint }) => (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate('ComplaintDetail', { complaintId: item.id })}
      >
        <Text style={styles.number}>{item.complaintNumber}</Text>
        <Text style={styles.name}>{item.customerName}</Text>
        <Text style={styles.type}>{item.complaintType} · {item.severity}</Text>
        <Text style={[styles.status, item.status === 'escalated' && styles.escalated]}>{item.status}</Text>
      </Pressable>
    ),
    [navigation],
  );

  if (isLoading) return <Screen><SkeletonLoader rows={5} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="settings.view">
      <AdminScreenLayout>
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No complaints</Text>}
        />
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  number: { fontSize: 12, fontWeight: '700', color: adminColors.primary },
  name: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginTop: 4 },
  type: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  status: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginTop: 6, textTransform: 'uppercase' },
  escalated: { color: adminColors.badgeDanger },
  empty: { textAlign: 'center', color: colors.textSecondary, padding: spacing.xl },
});
