import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { RoleGuard, StatusBadge } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import {
  useAllAttendanceToday,
  useLiveOfficerLocations,
} from '@/hooks/attendance/useAdminAttendance';
import type { AttendanceRecord, OfficerLiveLocation } from '@/types/attendance';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'LiveAttendance'>;

function AttendanceRow({ item }: { item: AttendanceRecord }) {
  return (
    <View style={styles.row}>
      <Text style={styles.name}>{item.officerName}</Text>
      <Text style={styles.meta}>
        In: {item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString() : '—'} ·
        Out: {item.checkOutTime ? new Date(item.checkOutTime).toLocaleTimeString() : '—'}
      </Text>
      <StatusBadge status={item.status} />
    </View>
  );
}

function LocationRow({ item }: { item: OfficerLiveLocation }) {
  const statusLabel =
    item.attendanceStatus === 'checked_in'
      ? 'On shift'
      : item.attendanceStatus === 'checked_out'
        ? 'Checked out'
        : 'Not started';

  return (
    <View style={styles.locationRow}>
      <Text style={styles.name}>{item.officerName}</Text>
      <Text style={styles.meta}>
        {statusLabel} · {item.coordinates.latitude.toFixed(4)}, {item.coordinates.longitude.toFixed(4)}
      </Text>
    </View>
  );
}

/** Web: list-based live attendance (maps are native-only). */
export function LiveAttendanceScreen({ navigation }: Props) {
  const { data: locations, isLoading: mapLoading, refetch: refetchLocations } = useLiveOfficerLocations();
  const { data: attendance, isLoading, isError, error, refetch } = useAllAttendanceToday();

  const counts = useMemo(() => {
    const records = attendance ?? [];
    return {
      present: records.filter((r) => r.status === 'present').length,
      absent: records.filter((r) => !r.checkInTime).length,
      late: records.filter((r) => r.isLate).length,
      onShift: (locations ?? []).filter((l) => l.attendanceStatus === 'checked_in').length,
    };
  }, [attendance, locations]);

  const renderItem = useCallback(
    ({ item }: { item: AttendanceRecord }) => <AttendanceRow item={item} />,
    [],
  );

  const renderLocation = useCallback(
    ({ item }: { item: OfficerLiveLocation }) => <LocationRow item={item} />,
    [],
  );

  const handleRefresh = useCallback(() => {
    void refetch();
    void refetchLocations();
  }, [refetch, refetchLocations]);

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

  return (
    <RoleGuard requiredPermission="attendance.view">
      <Screen padded={false} style={styles.canvas}>
        <View style={styles.countsBar}>
          <Text style={styles.count}>On shift {counts.onShift}</Text>
          <Text style={styles.count}>Present {counts.present}</Text>
          <Text style={styles.count}>Absent {counts.absent}</Text>
          <Text style={styles.count}>Late {counts.late}</Text>
        </View>

        <Text style={styles.sectionTitle}>Officer locations</Text>
        <FlatList
          data={locations ?? []}
          keyExtractor={(l) => l.officerId}
          renderItem={renderLocation}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.locationList}
          ListEmptyComponent={<Text style={styles.empty}>No live locations</Text>}
        />

        <Text style={styles.sectionTitle}>Today&apos;s attendance</Text>
        <FlatList
          data={attendance ?? []}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          refreshing={mapLoading}
          onRefresh={handleRefresh}
          ListEmptyComponent={<Text style={styles.empty}>No attendance records today</Text>}
        />

        <View style={styles.toolbar}>
          <Button label="Geofences" variant="ghost" onPress={() => navigation.navigate('GeofenceManagement')} />
          <Button label="Approvals" variant="ghost" onPress={() => navigation.navigate('ApprovalRequests')} />
          <Button label="Records" variant="ghost" onPress={() => navigation.navigate('AttendanceRecords')} />
        </View>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  canvas: { backgroundColor: adminColors.canvasBg },
  countsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: spacing.sm,
    backgroundColor: adminColors.cardBg,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xs,
  },
  count: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  locationList: { paddingHorizontal: spacing.sm, gap: spacing.sm },
  locationRow: {
    minWidth: 220,
    backgroundColor: adminColors.cardBg,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  row: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault, gap: spacing.xxs },
  name: { fontWeight: '600', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.sm, gap: spacing.xs },
  empty: { textAlign: 'center', padding: spacing.lg, color: colors.textSecondary },
});
