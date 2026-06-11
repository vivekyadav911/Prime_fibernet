import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { FormField, RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGeneratePayslipMutation, useGetPayrollQuery } from '@/store/api/endpoints';
import type { AdminPayrollStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminPayrollStackParamList, 'Payroll'>;

export function PayrollScreen({ navigation }: Props) {
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const { data, isLoading, isError, error, refetch } = useGetPayrollQuery({ month, year });
  const [generate] = useGeneratePayslipMutation();

  if (isLoading) return <Screen><SkeletonLoader rows={8} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="payroll.view">
      <Screen padded={false}>
        <View style={styles.toolbar}>
          <FormField label="Month" value={month} onChangeText={setMonth} />
          <FormField label="Year" value={year} onChangeText={setYear} />
          <Button label="Payslips Management" variant="ghost" onPress={() => navigation.navigate('PayslipsManagement')} />
        </View>
        <FlatList
          data={data ?? []}
          keyExtractor={(r) => r.officerId}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.name}>{item.officerName}</Text>
              <Text style={styles.meta}>
                Base ₹{item.baseSalary} · Allow ₹{item.allowances} · OT ₹{item.overtime} · Ded ₹{item.deductions}
              </Text>
              <Text style={styles.net}>Net ₹{item.netPay}</Text>
              <Button label="Generate payslip" variant="secondary" onPress={() => generate({ officerId: item.officerId, month, year })} />
            </View>
          )}
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  toolbar: { padding: spacing.sm },
  row: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault, gap: spacing.xxs },
  name: { fontWeight: '600' },
  meta: { fontSize: 12, color: colors.textSecondary },
  net: { fontWeight: '700', color: colors.primaryNavy },
});
