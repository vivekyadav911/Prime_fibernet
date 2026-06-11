import { FlatList, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetCompletedShiftsQuery } from '@/store/api/endpoints';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'CompletedShifts'>;

export function CompletedShiftsScreen(_props: Props) {
  const { data, isLoading, isError, error, refetch } = useGetCompletedShiftsQuery({});

  if (isLoading) return <Screen><SkeletonLoader rows={8} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="attendance.view">
      <Screen padded={false}>
        <FlatList
          data={data ?? []}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <Text style={styles.row}>
              {item.officerName} · {item.shiftDate} · {item.duration}h · {item.locationVerified ? '✓ GPS' : '✗ GPS'}
            </Text>
          )}
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  row: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault, fontSize: 13 },
});
