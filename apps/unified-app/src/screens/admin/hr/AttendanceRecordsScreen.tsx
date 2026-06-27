import { useCallback } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AdminScreenLayout, RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetAttendanceRecordsQuery } from '@/store/api/endpoints';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'AttendanceRecords'>;

export function AttendanceRecordsScreen(_props: Props) {
  const { data, isLoading, isError, error, refetch } = useGetAttendanceRecordsQuery({});

  const renderItem = useCallback(
    ({ item }: { item: NonNullable<typeof data>[number] }) => (
      <Text style={styles.row}>
        {item.officerName}: Present {item.present} · Absent {item.absent} · Late {item.late} · OT{' '}
        {item.overtime}h
      </Text>
    ),
    [],
  );

  if (isLoading) {
    return (
      <AdminScreenLayout>
        <SkeletonLoader rows={8} />
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
    <RoleGuard requiredPermission="attendance.view">
      <AdminScreenLayout padded={false}>
        <FlatList
          data={data ?? []}
          keyExtractor={(r) => r.officerId}
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
    fontSize: 13,
    color: colors.textPrimary,
  },
});
