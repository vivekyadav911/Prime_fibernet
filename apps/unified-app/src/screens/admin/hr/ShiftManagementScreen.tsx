import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AdminButton, AdminScreenLayout, AdminStateShell, RoleGuard } from '@/components/admin';
import { useCreateShift, useDeleteShift, useShifts } from '@/hooks/attendance/useAdminAttendance';
import type { ShiftDefinition } from '@/types/attendance';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'ShiftManagement'>;

function ShiftCard({
  item,
  onDelete,
}: {
  item: ShiftDefinition;
  onDelete: (id: string) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.meta}>
        {item.startTime} – {item.endTime} · {item.type} · Grace {item.graceMinutes}m
      </Text>
      <Text style={styles.meta}>👥 {item.assignedOfficers.length} officers</Text>
      <AdminButton label="Delete" variant="ghost" onPress={() => onDelete(item.id)} />
    </View>
  );
}

export function ShiftManagementScreen(_props: Props) {
  const { data, isLoading, isError, error, refetch } = useShifts();
  const [createShift, { isLoading: creating }] = useCreateShift();
  const [deleteShift] = useDeleteShift();

  const handleAdd = useCallback(async () => {
    await createShift({
      name: `Shift ${(data?.length ?? 0) + 1}`,
      type: 'fixed',
      startTime: '09:00',
      endTime: '18:00',
      graceMinutes: 15,
      breakMinutes: 60,
      overtimeThresholdMinutes: 30,
      isOvernight: false,
      assignedOfficers: [],
    });
    refetch();
  }, [createShift, data?.length, refetch]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteShift(id);
      refetch();
    },
    [deleteShift, refetch],
  );

  const renderItem = useCallback(
    ({ item }: { item: ShiftDefinition }) => (
      <ShiftCard item={item} onDelete={(id) => void handleDelete(id)} />
    ),
    [handleDelete],
  );

  const listHeader = (
    <View style={styles.header}>
      <Text style={styles.title}>Shift management</Text>
      <AdminButton
        label="Add shift"
        loading={creating}
        loadingLabel="Adding…"
        onPress={() => void handleAdd()}
      />
    </View>
  );

  return (
    <RoleGuard requiredPermission="attendance.edit">
      <AdminStateShell
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        loadingRows={6}
      >
        <AdminScreenLayout padded={false}>
          <FlatList
            data={data ?? []}
            keyExtractor={(s) => s.id}
            renderItem={renderItem}
            ListHeaderComponent={listHeader}
            contentContainerStyle={adminScreenStyles.listContent}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </AdminScreenLayout>
      </AdminStateShell>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  card: {
    backgroundColor: adminColors.cardBg,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  name: { fontWeight: '600', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
});
