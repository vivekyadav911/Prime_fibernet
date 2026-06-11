import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { DateField, RoleGuard, StatusBadge } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetAttendanceQuery } from '@/store/api/endpoints';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'Attendance'>;

export function AttendanceScreen({ navigation }: Props) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data, isLoading, isError, error, refetch } = useGetAttendanceQuery({ date });

  if (isLoading) return <Screen><SkeletonLoader rows={8} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="attendance.view">
      <Screen padded={false}>
        <View style={styles.toolbar}>
          <DateField label="Date" value={date} onChange={setDate} placeholder="Select date" />
          <Button label="Exceptions" variant="ghost" onPress={() => navigation.navigate('CheckInExceptions')} />
          <Button label="Records" variant="ghost" onPress={() => navigation.navigate('AttendanceRecords')} />
          <Button label="Completed Shifts" variant="ghost" onPress={() => navigation.navigate('CompletedShifts')} />
        </View>
        <FlatList
          data={data ?? []}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.name}>{item.officerName}</Text>
              <Text style={styles.meta}>
                In: {item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString() : '—'} ·
                Out: {item.checkOutTime ? new Date(item.checkOutTime).toLocaleTimeString() : '—'} ·
                {item.hoursWorked}h
              </Text>
              <StatusBadge status={item.status} />
            </View>
          )}
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  toolbar: { padding: spacing.sm, gap: spacing.xs },
  row: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault, gap: spacing.xxs },
  name: { fontWeight: '600' },
  meta: { fontSize: 12, color: colors.textSecondary },
});
