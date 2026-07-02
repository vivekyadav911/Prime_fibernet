import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { AdminScreenLayout, RoleGuard } from '@/components/admin';
import { SkeletonLoader } from '@/components/common';
import { useAssignGeofence, useGeofence } from '@/hooks/attendance/useAdminAttendance';
import { useGetOfficersQuery } from '@/services/api/officersApi';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'AssignGeofence'>;

export function AssignGeofenceScreen({ route, navigation }: Props) {
  const { geofenceId } = route.params;
  const { data: geofence, isLoading: geoLoading } = useGeofence(geofenceId);
  const { data: officers, isLoading: officersLoading } = useGetOfficersQuery();
  const [assign, { isLoading: saving }] = useAssignGeofence();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (officers ?? []).filter((o) => !q || o.name.toLowerCase().includes(q));
  }, [officers, search]);

  const handleSave = useCallback(async () => {
    setSaveError(null);
    try {
      await assign({ id: geofenceId, officerIds: [...selected] }).unwrap();
      navigation.goBack();
    } catch (e) {
      const message = queryErrorMessage(e);
      setSaveError(message);
      Alert.alert('Assign failed', message);
    }
  }, [assign, geofenceId, navigation, selected]);

  if (geoLoading || officersLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={8} />
      </Screen>
    );
  }

  return (
    <RoleGuard requiredPermission="attendance.edit">
      <AdminScreenLayout>
        <Text style={styles.title}>Assign officers — {geofence?.name}</Text>
        <Text style={styles.subtitle}>
          {selected.size} selected · {geofence?.assignedOfficers.length ?? 0} currently assigned
        </Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search officers"
          style={styles.search}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
        <FlatList
          data={filtered}
          keyExtractor={(o) => o.id}
          renderItem={({ item }) => {
            const isSelected = selected.has(item.id);
            return (
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.name}>{item.name}</Text>
                  {geofence?.assignedOfficers.includes(item.id) ? (
                    <Text style={styles.assignedTag}>Currently assigned</Text>
                  ) : null}
                </View>
                <Button
                  label={isSelected ? 'Selected' : 'Select'}
                  variant={isSelected ? 'primary' : 'ghost'}
                  onPress={() => toggle(item.id)}
                />
              </View>
            );
          }}
        />
        <Button
          label={saving ? 'Saving…' : 'Save assignments'}
          onPress={() => void handleSave()}
          disabled={saving}
        />
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '600', marginBottom: spacing.xxs, color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md },
  search: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceWhite,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  rowText: { flex: 1, marginRight: spacing.sm },
  name: { color: colors.textPrimary, fontWeight: '600' },
  assignedTag: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  error: { color: colors.errorRed, marginBottom: spacing.sm },
});
