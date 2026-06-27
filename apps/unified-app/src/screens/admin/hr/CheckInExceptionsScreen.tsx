import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminButton, AdminScreenLayout, RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetCheckInExceptionsQuery, useReviewCheckInExceptionMutation } from '@/store/api/endpoints';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'CheckInExceptions'>;

export function CheckInExceptionsScreen(_props: Props) {
  const { data, isLoading, isError, error, refetch } = useGetCheckInExceptionsQuery();
  const [review] = useReviewCheckInExceptionMutation();

  const renderItem = useCallback(
    ({ item }: { item: NonNullable<typeof data>[number] }) => (
      <View style={styles.row}>
        <Text style={styles.name}>{item.officerName}</Text>
        <Text style={styles.meta}>
          {item.reason} · {new Date(item.checkInTime).toLocaleString()}
        </Text>
        <View style={styles.actions}>
          <AdminButton label="Approve" variant="secondary" onPress={() => review({ id: item.id, action: 'approve' })} />
          <AdminButton label="Reject" variant="ghost" onPress={() => review({ id: item.id, action: 'reject' })} />
        </View>
      </View>
    ),
    [review],
  );

  if (isLoading) {
    return (
      <AdminScreenLayout>
        <SkeletonLoader rows={6} />
      </AdminScreenLayout>
    );
  }

  if (isError) {
    return (
      <AdminScreenLayout>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </AdminScreenLayout>
    );
  }

  return (
    <RoleGuard requiredPermission="attendance.edit">
      <AdminScreenLayout padded={false}>
        <FlatList
          data={data ?? []}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={adminScreenStyles.listContent}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xs,
  },
  name: { fontWeight: '600', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: spacing.xs },
});
