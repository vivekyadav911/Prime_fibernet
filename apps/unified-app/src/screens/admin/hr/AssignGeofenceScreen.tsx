import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { AdminScreenLayout, RoleGuard } from '@/components/admin';
import { SkeletonLoader } from '@/components/common';
import { useAssignGeofence, useGeofence } from '@/hooks/attendance/useAdminAttendance';
import { useGetOfficersQuery } from '@/store/api/endpoints';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'AssignGeofence'>;

export function AssignGeofenceScreen({ route, navigation }: Props) {
  const { geofenceId } = route.params;
  const { data: geofence, isLoading: geoLoading } = useGeofence(geofenceId);
  const { data: officers, isLoading: officersLoading } = useGetOfficersQuery();
  const [assign, { isLoading: saving }] = useAssignGeofence();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search] = useState('');

  useEffect(() => {
    if (geofence) setSelected(new Set(geofence.assignedOfficers));
  }, [geofence]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    await assign({ id: geofenceId, officerIds: [...selected] });
    navigation.goBack();
  }, [assign, geofenceId, navigation, selected]);

  const filtered = (officers ?? []).filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (geoLoading || officersLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={8} />
      </Screen>
    );
  }

  return (
    <RoleGuard requiredPermission="attendance.edit">
      <AdminScreenLayout padded={false}>
        <FlatList
          data={filtered}
          keyExtractor={(o) => o.id}
          ListHeaderComponent={<Text style={styles.title}>Assign officers — {geofence?.name}</Text>}
          ListFooterComponent={
            <Button label={saving ? 'Saving…' : 'Save'} onPress={() => void handleSave()} disabled={saving} />
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <Button
                label={selected.has(item.id) ? '✓' : '○'}
                variant="ghost"
                onPress={() => toggle(item.id)}
              />
            </View>
          )}
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
  title: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  name: { color: colors.textPrimary },
});
