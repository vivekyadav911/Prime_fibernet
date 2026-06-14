import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar';
import { DateField, RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useAdminAttendance } from '@/hooks/attendance/useAdminAttendance';
import type { AttendanceRecord } from '@/types/attendance';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'AttendanceRecords'>;

export function AttendanceRecordsScreenEnhanced(_props: Props) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const now = new Date();
  const { data, isLoading, isError, error, refetch } = useAdminAttendance({ date });

  const renderItem = useCallback(
    ({ item }: { item: AttendanceRecord }) => (
      <View style={styles.row}>
        <Text style={styles.name}>{item.officerName}</Text>
        <Text style={styles.meta}>
          {item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString() : '—'} →
          {item.checkOutTime ? new Date(item.checkOutTime).toLocaleTimeString() : '—'}
        </Text>
        <Text style={styles.method}>
          {item.checkInMethod === 'approved_outside' ? 'OUT OF ZONE' : 'IN ZONE'}
        </Text>
      </View>
    ),
    [],
  );

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={8} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  const records = data ?? [];
  const present = records.filter((r) => r.status === 'present').length;
  const absent = records.filter((r) => r.status === 'absent').length;

  return (
    <RoleGuard requiredPermission="attendance.view">
      <Screen padded={false} style={styles.canvas}>
        <View style={styles.toolbar}>
          <DateField label="Date" value={date} onChange={setDate} placeholder="Select date" />
          <Button
            label={viewMode === 'list' ? 'Calendar' : 'List'}
            variant="ghost"
            onPress={() => setViewMode((v) => (v === 'list' ? 'calendar' : 'list'))}
          />
        </View>
        <View style={styles.summary}>
          <Text style={styles.summaryItem}>Present: {present}</Text>
          <Text style={styles.summaryItem}>Absent: {absent}</Text>
        </View>
        {viewMode === 'calendar' ? (
          <View style={styles.calendar}>
            <AttendanceCalendar
              year={now.getFullYear()}
              month={now.getMonth() + 1}
              records={records.map((r) => ({ date: r.date, status: r.status }))}
            />
          </View>
        ) : (
          <FlatList
            data={records}
            keyExtractor={(r) => r.id}
            renderItem={renderItem}
            ListEmptyComponent={<Text style={styles.empty}>No records</Text>}
          />
        )}
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  canvas: { backgroundColor: adminColors.canvasBg },
  toolbar: { padding: spacing.sm, gap: spacing.xs },
  summary: { flexDirection: 'row', gap: spacing.lg, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  summaryItem: { fontWeight: '600', color: colors.textPrimary },
  calendar: { padding: spacing.md },
  row: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault },
  name: { fontWeight: '600', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary },
  method: { fontSize: 11, color: colors.accentTeal, marginTop: 4 },
  empty: { textAlign: 'center', padding: spacing.xl, color: colors.textSecondary },
});
