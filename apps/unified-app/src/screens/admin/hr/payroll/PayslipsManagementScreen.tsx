import { FlatList, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetAllPayslipsQuery } from '@/store/api/endpoints';
import type { AdminPayrollStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminPayrollStackParamList, 'PayslipsManagement'>;

export function PayslipsManagementScreen(_props: Props) {
  const { data, isLoading, isError, error, refetch } = useGetAllPayslipsQuery({});

  if (isLoading) return <Screen><SkeletonLoader rows={8} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="payroll.view">
      <Screen padded={false}>
        <FlatList
          data={data ?? []}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <Text style={styles.row}>
              {item.officerName} · {item.month} · ₹{item.amount} · {new Date(item.issuedDate).toLocaleDateString()}
              {item.pdfUrl ? ' · PDF' : ''}
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
