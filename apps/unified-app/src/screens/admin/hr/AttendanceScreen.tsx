import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminButton, AdminScreenLayout, DateField, RoleGuard, StatusBadge } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetAttendanceQuery } from '@/store/api/endpoints';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'AttendanceHub'>;

export function AttendanceScreen({ navigation }: Props) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data, isLoading, isError, error, refetch } = useGetAttendanceQuery({ date });

  const listHeader = useMemo(
    () => (
      <View style={adminScreenStyles.listHeader}>
        <DateField label="Date" value={date} onChange={setDate} placeholder="Select date" />
        <View style={styles.navRow}>
          <AdminButton label="Live" variant="ghost" onPress={() => navigation.navigate('LiveAttendance')} />
          <AdminButton label="Geofences" variant="ghost" onPress={() => navigation.navigate('GeofenceManagement')} />
          <AdminButton label="Approvals" variant="ghost" onPress={() => navigation.navigate('ApprovalRequests')} />
          <AdminButton label="Records" variant="ghost" onPress={() => navigation.navigate('AttendanceRecords')} />
          <AdminButton label="Shifts" variant="ghost" onPress={() => navigation.navigate('ShiftManagement')} />
          <AdminButton label="Leave" variant="ghost" onPress={() => navigation.navigate('LeaveManagement')} />
          <AdminButton label="Reports" variant="ghost" onPress={() => navigation.navigate('AttendanceReports')} />
          <AdminButton label="Exceptions" variant="ghost" onPress={() => navigation.navigate('CheckInExceptions')} />
          <AdminButton label="Completed" variant="ghost" onPress={() => navigation.navigate('CompletedShifts')} />
        </View>
      </View>
    ),
    [date, navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: NonNullable<typeof data>[number] }) => (
      <View style={styles.row}>
        <Text style={styles.name}>{item.officerName}</Text>
        <Text style={styles.meta}>
          In: {item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString() : '—'} · Out:{' '}
          {item.checkOutTime ? new Date(item.checkOutTime).toLocaleTimeString() : '—'} · {item.hoursWorked}h
        </Text>
        <StatusBadge status={item.status} />
      </View>
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
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
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
  navRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xxs,
  },
  name: { fontWeight: '600', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary },
});
