import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar';
import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { useAttendanceHistory } from '@/hooks/attendance/useAttendance';
import type { AttendanceRecord } from '@/types/attendance';
import type { OfficerDrawerParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<OfficerDrawerParamList, 'AttendanceHistory'>;

function HistoryRow({ item }: { item: AttendanceRecord }) {
  return (
    <View style={styles.row}>
      <Text style={styles.date}>{item.date}</Text>
      <Text style={styles.meta}>
        In: {item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString() : '—'} ·
        Out: {item.checkOutTime ? new Date(item.checkOutTime).toLocaleTimeString() : '—'}
      </Text>
      <Text style={styles.badge}>{item.status.replace('_', ' ')}</Text>
    </View>
  );
}

export function AttendanceHistoryScreen(_props: Props) {
  const now = new Date();
  const [month] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());

  const { data, isLoading, isError, error, refetch } = useAttendanceHistory({ month, year });

  const renderItem = useCallback(
    ({ item }: { item: AttendanceRecord }) => <HistoryRow item={item} />,
    [],
  );

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={10} />
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
  const late = records.filter((r) => r.isLate).length;

  return (
    <Screen padded={false}>
      <View style={styles.summary}>
        <Text style={styles.summaryText}>Present: {present}</Text>
        <Text style={styles.summaryText}>Absent: {absent}</Text>
        <Text style={styles.summaryText}>Late: {late}</Text>
      </View>
      <View style={styles.calendarWrap}>
        <AttendanceCalendar
          year={year}
          month={month}
          records={records.map((r) => ({ date: r.date, status: r.status }))}
        />
      </View>
      <FlatList
        data={records}
        keyExtractor={(r) => r.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <EmptyState
            title="No records this month"
            subtitle="Attendance records will appear here after check-in."
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  summaryText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  calendarWrap: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  row: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault },
  date: { fontWeight: '600', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  badge: { fontSize: 11, color: colors.accentTeal, marginTop: 4, textTransform: 'capitalize' },
  empty: { textAlign: 'center', padding: spacing.xl, color: colors.textSecondary },
});
