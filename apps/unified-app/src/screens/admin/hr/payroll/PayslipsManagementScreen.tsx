import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AdminButton, AdminScreenLayout, RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { PayrollMonthYearPicker } from '@/components/payroll/PayrollMonthYearPicker';
import { useGetPayrollDashboardQuery } from '@/services/api/payrollApi';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminPayrollStackParamList } from '@/types/navigation';
import type { PayrollDashboardEntry } from '@/types/payslip';
import { formatCurrencyInrPrecise } from '@/utils/formatCurrency';
import { payslipPdfViewerParams } from '@/utils/payslipNavigation';
import { periodFromMonthYear } from '@/utils/payrollPeriod';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminPayrollStackParamList, 'PayslipsManagement'>;

export function PayslipsManagementScreen({ navigation }: Props) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const period = periodFromMonthYear(month, year);

  const { data, isLoading, isError, error, refetch } = useGetPayrollDashboardQuery({
    month: period.month,
    year: period.year,
  });

  const openReview = useCallback(
    (item: PayrollDashboardEntry) => {
      if (!item.payslipId) return;
      navigation.navigate('PayslipReview', {
        officerId: item.officerId,
        periodStart: item.payPeriodStart,
        periodEnd: item.payPeriodEnd,
        payslipId: item.payslipId,
      });
    },
    [navigation],
  );

  const openPdf = useCallback(
    (item: PayrollDashboardEntry) => {
      const params = payslipPdfViewerParams({
        generatedPdfUrl: item.generatedPdfUrl,
        payPeriodLabel: item.payPeriodLabel ?? period.label,
        employeeName: item.officerName,
      });
      if (!params) {
        Alert.alert('No PDF', 'Generate the payslip PDF from the review screen first.');
        return;
      }
      navigation.navigate('PayslipPdfViewer', params);
    },
    [navigation, period.label],
  );

  const listHeader = (
    <View style={adminScreenStyles.listHeader}>
      <PayrollMonthYearPicker
        month={period.month}
        year={period.year}
        onChange={(m, y) => {
          const next = periodFromMonthYear(m, y);
          setMonth(next.month);
          setYear(next.year);
        }}
      />
    </View>
  );

  if (isLoading) {
    return (
      <AdminScreenLayout>
        <SkeletonLoader rows={8} />
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

  const withPayslips = (data ?? []).filter((e) => e.payslipId);

  return (
    <RoleGuard requiredPermission="payroll.view">
      <AdminScreenLayout padded={false}>
        <FlatList
          data={withPayslips}
          keyExtractor={(r) => r.payslipId!}
          ListHeaderComponent={listHeader}
          contentContainerStyle={adminScreenStyles.listContent}
          style={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No payslips for {period.label}</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.name}>{item.officerName}</Text>
                <Text style={styles.meta}>
                  {item.status} ·{' '}
                  {item.netPayPreview != null
                    ? formatCurrencyInrPrecise(item.netPayPreview)
                    : '—'}
                </Text>
              </View>
              <View style={styles.rowActions}>
                <AdminButton label="Review" variant="ghost" onPress={() => openReview(item)} />
                {item.generatedPdfUrl ? (
                  <AdminButton label="View PDF" variant="secondary" onPress={() => openPdf(item)} />
                ) : null}
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  row: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.sm,
  },
  rowText: { gap: spacing.xxs },
  name: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary },
  rowActions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  empty: { textAlign: 'center', color: colors.textSecondary, padding: spacing.lg },
});
