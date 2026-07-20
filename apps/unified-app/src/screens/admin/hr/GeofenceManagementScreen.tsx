import { useCallback, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AdminButton,
  AdminScreenLayout,
  AdminEmptyState,
  ConfirmModal,
  RoleGuard,
} from '@/components/admin';
import { GeofenceOverviewMap } from '@/components/map/GeofenceOverviewMap';
import { ErrorState, SkeletonLoader, ToggleSwitch } from '@/components/common';
import { useAttendanceRealtimeSync } from '@/hooks/attendance/useAttendanceRealtimeSync';
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
import { pageLayout } from '@/theme/pageLayout';
import { spacing } from '@/theme/spacing';
import { formatGeofenceAddress } from '@/utils/geofenceDisplay';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'GeofenceManagement'>;

type PendingConfirm =
  | { kind: 'disable'; geofence: Geofence }
  | { kind: 'delete'; id: string }
  | null;

const SPLIT_MIN_WIDTH = 900;

function GeofenceCard({
  item,
  selected,
  onEdit,
  onAssign,
  onDelete,
  onToggle,
}: {
  item: Geofence;
  selected?: boolean;
  onEdit: (g: Geofence) => void;
  onAssign: (g: Geofence) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const radiusLabel =
    item.geometry.shape === 'circle' ? `${item.geometry.radius}m` : 'Polygon';
  const addressLine = formatGeofenceAddress(item);

  return (
    <View style={[styles.card, selected && styles.cardSelected]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name || 'Unnamed geofence'}</Text>
        <ToggleSwitch value={item.isActive} onValueChange={(v) => onToggle(item.id, v)} />
      </View>
      <Text style={styles.cardMeta}>📍 {addressLine}</Text>
      <Text style={styles.cardMeta}>
        ⭕ {radiusLabel} · 👥 {item.assignedOfficers.length} officer
        {item.assignedOfficers.length === 1 ? '' : 's'}
      </Text>
      <View style={styles.cardActions}>
        <AdminButton label="Edit" variant="ghost" onPress={() => onEdit(item)} />
        <AdminButton label="Assign" variant="ghost" onPress={() => onAssign(item)} />
        <AdminButton label="Delete" variant="ghost" onPress={() => onDelete(item.id)} />
      </View>
    </View>
  );
}

export function GeofenceManagementScreen({ navigation }: Props) {
  useAttendanceRealtimeSync();
  const { width } = useWindowDimensions();
  const useSplit = Platform.OS === 'web' && width >= SPLIT_MIN_WIDTH;
  const { data, isLoading, isError, error, refetch } = useGeofences();
  const [toggleGeofence] = useToggleGeofence();
  const [deleteGeofence] = useDeleteGeofence();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingConfirm>(null);

  const performToggle = useCallback(
    (geofence: Geofence, isActive: boolean) => {
      void toggleGeofence({ id: geofence.id, isActive }).then(() => refetch());
    },
    [refetch, toggleGeofence],
  );

  const handleToggle = useCallback(
    (geofence: Geofence, isActive: boolean) => {
      const assignedCount = geofence.assignedOfficers.length;

      if (!isActive && assignedCount > 0) {
        setPending({ kind: 'disable', geofence });
        return;
      }

      performToggle(geofence, isActive);
    },
    [performToggle],
  );

  const handleDelete = useCallback((id: string) => {
    setPending({ kind: 'delete', id });
  }, []);

  const handleConfirm = useCallback(() => {
    if (!pending) return;
    if (pending.kind === 'disable') {
      performToggle(pending.geofence, false);
    } else {
      void deleteGeofence(pending.id).then(() => refetch());
    }
    setPending(null);
  }, [deleteGeofence, pending, performToggle, refetch]);

  const onToggleCard = useCallback(
    (id: string, v: boolean) => {
      const geofence = (data ?? []).find((g) => g.id === id);
      if (geofence) handleToggle(geofence, v);
    },
    [data, handleToggle],
  );

  const renderItem = useCallback(
    ({ item }: { item: Geofence }) => (
      <Pressable onPress={() => setSelectedId(item.id)}>
        <GeofenceCard
          item={item}
          selected={item.id === selectedId}
          onEdit={() => navigation.navigate('CreateGeofence', { geofenceId: item.id })}
          onAssign={() => navigation.navigate('AssignGeofence', { geofenceId: item.id })}
          onDelete={handleDelete}
          onToggle={onToggleCard}
        />
      </Pressable>
    ),
    [handleDelete, navigation, onToggleCard, selectedId],
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
  const disableTarget = pending?.kind === 'disable' ? pending.geofence : null;

  const headerRow = (
    <View style={styles.header}>
      <Text style={styles.title}>Geofences</Text>
      <AdminButton
        label="Add geofence"
        onPress={() => navigation.navigate('CreateGeofence', {})}
      />
    </View>
  );

  const confirmModal = (
    <ConfirmModal
      visible={pending != null}
      title={pending?.kind === 'delete' ? 'Delete geofence?' : 'Disable geofence?'}
      message={
        pending?.kind === 'delete'
          ? 'This cannot be undone.'
          : disableTarget
            ? `${disableTarget.assignedOfficers.length} officer${disableTarget.assignedOfficers.length === 1 ? '' : 's'} use "${disableTarget.name}" — disabling will block their check-in. Continue?`
            : ''
      }
      confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Disable'}
      onConfirm={handleConfirm}
      onCancel={() => setPending(null)}
    />
  );

  const empty = (
    <AdminEmptyState
      title="No geofences yet"
      subtitle="Create a geofence so officers can check in within an approved zone."
      actionLabel="Add geofence"
      onAction={() => navigation.navigate('CreateGeofence', {})}
      iconName="location-outline"
    />
  );

  if (useSplit) {
    return (
      <RoleGuard requiredPermission="attendance.edit">
        <AdminScreenLayout padded={false}>
          <View style={styles.splitPage}>
            {headerRow}
            <View style={styles.splitBody}>
              <View style={styles.mapPane}>
                <GeofenceOverviewMap
                  geofences={geofences}
                  selectedId={selectedId}
                  fill
                />
              </View>
              <View style={styles.splitDivider} />
              <View style={styles.listPane}>
                <FlatList
                  data={geofences}
                  keyExtractor={(g) => g.id}
                  renderItem={renderItem}
                  contentContainerStyle={styles.splitListContent}
                  style={styles.list}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={empty}
                />
              </View>
            </View>
          </View>
          {confirmModal}
        </AdminScreenLayout>
      </RoleGuard>
    );
  }

  const listHeader = (
    <View style={adminScreenStyles.listHeader}>
      {headerRow}
      <GeofenceOverviewMap geofences={geofences} selectedId={selectedId} />
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
          ListEmptyComponent={empty}
        />
        {confirmModal}
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
  splitPage: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: pageLayout.pagePadding,
    paddingTop: pageLayout.contentTop,
    paddingBottom: pageLayout.contentBottom,
    gap: spacing.sm,
  },
  splitBody: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    gap: 0,
  },
  mapPane: {
    flex: 3,
    minWidth: 0,
    minHeight: 0,
  },
  splitDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderDefault,
    marginHorizontal: spacing.md,
  },
  listPane: {
    flex: 1,
    minWidth: 280,
    maxWidth: 420,
    minHeight: 0,
  },
  splitListContent: {
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  cardSelected: {
    borderColor: adminColors.primary,
    borderWidth: 1.5,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, flex: 1 },
  cardMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  cardActions: { flexDirection: 'row', marginTop: spacing.sm },
});
