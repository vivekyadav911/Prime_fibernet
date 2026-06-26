import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useCreateShift, useDeleteShift, useShifts } from '@/hooks/attendance/useAdminAttendance';
import type { ShiftDefinition } from '@/types/attendance';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

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
      <Button label="Delete" variant="ghost" onPress={() => onDelete(item.id)} />
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

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={6} />
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
    <RoleGuard requiredPermission="attendance.edit">
      <Screen padded={false} style={adminScreenStyles.canvas}>
        <View style={styles.header}>
          <Text style={styles.title}>Shift management</Text>
          <Button label={creating ? 'Adding…' : 'Add shift'} onPress={() => void handleAdd()} disabled={creating} />
        </View>
        <FlatList
          data={data ?? []}
          keyExtractor={(s) => s.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  list: { padding: spacing.sm },
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
