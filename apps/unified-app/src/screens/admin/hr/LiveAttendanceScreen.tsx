import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Circle, Marker } from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { RoleGuard, StatusBadge } from '@/components/admin';
import { FreeMapView } from '@/components/map';
import { ErrorState, SkeletonLoader } from '@/components/common';
import {
  useAllAttendanceToday,
  useGeofences,
  useLiveOfficerLocations,
} from '@/hooks/attendance/useAdminAttendance';
import type { AttendanceRecord } from '@/types/attendance';
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

export function LiveAttendanceScreen({ navigation }: Props) {
  const { data: locations, isLoading: mapLoading } = useLiveOfficerLocations();
  const { data: attendance, isLoading, isError, error, refetch } = useAllAttendanceToday();
  const { data: geofences } = useGeofences();

  const counts = useMemo(() => {
    const records = attendance ?? [];
    return {
      present: records.filter((r) => r.status === 'present').length,
      absent: records.filter((r) => !r.checkInTime).length,
      late: records.filter((r) => r.isLate).length,
    };
  }, [attendance]);

  const renderItem = useCallback(
    ({ item }: { item: AttendanceRecord }) => <AttendanceRow item={item} />,
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

  const initialRegion = {
    latitude: locations?.[0]?.coordinates.latitude ?? 28.6139,
    longitude: locations?.[0]?.coordinates.longitude ?? 77.209,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  };

  return (
    <RoleGuard requiredPermission="attendance.view">
      <Screen padded={false} style={styles.canvas}>
        <FreeMapView style={styles.map} initialRegion={initialRegion}>
          {(locations ?? []).map((loc) => (
            <Marker
              key={loc.officerId}
              coordinate={loc.coordinates}
              title={loc.officerName}
              pinColor={loc.attendanceStatus === 'checked_in' ? 'green' : 'red'}
            />
          ))}
          {(geofences ?? []).map((g) => {
            if (g.geometry.shape !== 'circle') return null;
            return (
              <Circle
                key={g.id}
                center={g.geometry.center}
                radius={g.geometry.radius}
                strokeColor={adminColors.primary}
                fillColor="rgba(91,79,207,0.12)"
              />
            );
          })}
        </FreeMapView>

        <View style={styles.countsBar}>
          <Text style={styles.count}>Present {counts.present}</Text>
          <Text style={styles.count}>Absent {counts.absent}</Text>
          <Text style={styles.count}>Late {counts.late}</Text>
        </View>

        <FlatList
          data={attendance ?? []}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          refreshing={mapLoading}
          onRefresh={refetch}
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
  map: { height: 260 },
  countsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: spacing.sm,
    backgroundColor: adminColors.cardBg,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  count: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  row: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault, gap: spacing.xxs },
  name: { fontWeight: '600', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.sm, gap: spacing.xs },
});
