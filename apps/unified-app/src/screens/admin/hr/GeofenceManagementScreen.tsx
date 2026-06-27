import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Circle } from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@prime/ui';

import { AdminScreenLayout, AdminEmptyState, RoleGuard } from '@/components/admin';
import { FreeMapView } from '@/components/map';
import { ErrorState, SkeletonLoader, ToggleSwitch } from '@/components/common';
import {
  useDeleteGeofence,
  useGeofences,
  useToggleGeofence,
} from '@/hooks/attendance/useAdminAttendance';
import type { Geofence } from '@/types/attendance';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { formatGeofenceAddress } from '@/utils/geofenceDisplay';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'GeofenceManagement'>;

function GeofenceCard({
  item,
  onEdit,
  onAssign,
  onDelete,
  onToggle,
}: {
  item: Geofence;
  onEdit: (g: Geofence) => void;
  onAssign: (g: Geofence) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const radius =
    item.geometry.shape === 'circle' ? `${item.geometry.radius}m` : 'Polygon';
  const addressLine = formatGeofenceAddress(item);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name || 'Unnamed geofence'}</Text>
        <ToggleSwitch value={item.isActive} onValueChange={(v) => onToggle(item.id, v)} />
      </View>
      <Text style={styles.cardMeta}>📍 {addressLine}</Text>
      <Text style={styles.cardMeta}>
        ⭕ {radius} · 👥 {item.assignedOfficers.length} officer
        {item.assignedOfficers.length === 1 ? '' : 's'}
      </Text>
      <View style={styles.cardActions}>
        <Button label="Edit" variant="ghost" onPress={() => onEdit(item)} />
        <Button label="Assign" variant="ghost" onPress={() => onAssign(item)} />
        <Button label="Delete" variant="ghost" onPress={() => onDelete(item.id)} />
      </View>
    </View>
  );
}

export function GeofenceManagementScreen({ navigation }: Props) {
  const { data, isLoading, isError, error, refetch } = useGeofences();
  const [toggleGeofence] = useToggleGeofence();
  const [deleteGeofence] = useDeleteGeofence();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleToggle = useCallback(
    (geofence: Geofence, isActive: boolean) => {
      const assignedCount = geofence.assignedOfficers.length;

      const performToggle = () => {
        void toggleGeofence({ id: geofence.id, isActive }).then(() => refetch());
      };

      if (!isActive && assignedCount > 0) {
        Alert.alert(
          'Disable geofence?',
          `${assignedCount} officer${assignedCount === 1 ? '' : 's'} use "${geofence.name}" — disabling will block their check-in. Continue?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Disable', style: 'destructive', onPress: performToggle },
          ],
        );
        return;
      }

      performToggle();
    },
    [refetch, toggleGeofence],
  );

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert('Delete geofence?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void deleteGeofence(id).then(() => refetch()),
        },
      ]);
    },
    [deleteGeofence, refetch],
  );

  const renderItem = useCallback(
    ({ item }: { item: Geofence }) => (
      <Pressable onPress={() => setSelectedId(item.id)}>
        <GeofenceCard
          item={item}
          onEdit={() => navigation.navigate('CreateGeofence', { geofenceId: item.id })}
          onAssign={() => navigation.navigate('AssignGeofence', { geofenceId: item.id })}
          onDelete={handleDelete}
          onToggle={(id, v) => {
            const geofence = (data ?? []).find((g) => g.id === id);
            if (geofence) handleToggle(geofence, v);
          }}
        />
      </Pressable>
    ),
    [data, handleDelete, handleToggle, navigation],
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

  const geofences = data ?? [];
  const mapRegion = {
    latitude: geofences[0]?.geometry.shape === 'circle'
      ? geofences[0].geometry.center.latitude
      : 28.6139,
    longitude: geofences[0]?.geometry.shape === 'circle'
      ? geofences[0].geometry.center.longitude
      : 77.209,
    latitudeDelta: 0.2,
    longitudeDelta: 0.2,
  };

  const listHeader = (
    <View style={adminScreenStyles.listHeader}>
      <View style={styles.header}>
        <Text style={styles.title}>Geofences</Text>
        <Button
          label="Add geofence"
          onPress={() => navigation.navigate('CreateGeofence', {})}
        />
      </View>

      <FreeMapView style={styles.map} initialRegion={mapRegion}>
        {geofences.map((g) => {
          if (g.geometry.shape !== 'circle') return null;
          return (
            <Circle
              key={g.id}
              center={g.geometry.center}
              radius={g.geometry.radius}
              strokeColor={g.id === selectedId ? adminColors.primary : colors.textSecondary}
              fillColor={g.isActive ? 'rgba(91,79,207,0.2)' : 'rgba(150,150,150,0.2)'}
            />
          );
        })}
      </FreeMapView>
    </View>
  );

  return (
    <RoleGuard requiredPermission="attendance.edit">
      <AdminScreenLayout padded={false}>
        <FlatList
          data={geofences}
          keyExtractor={(g) => g.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          contentContainerStyle={adminScreenStyles.listContent}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <AdminEmptyState
              title="No geofences yet"
              subtitle="Create a geofence so officers can check in within an approved zone."
              actionLabel="Add geofence"
              onAction={() => navigation.navigate('CreateGeofence', {})}
              iconName="location-outline"
            />
          }
        />
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  map: { height: 220 },
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, flex: 1 },
  cardMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  cardActions: { flexDirection: 'row', marginTop: spacing.sm },
});
