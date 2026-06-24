import { useCallback } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetPayrollDashboardQuery } from '@/services/api/payrollApi';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminPayrollStackParamList } from '@/types/navigation';
import type { PayrollDashboardEntry } from '@/types/payslip';
import { formatCurrencyInrPrecise } from '@/utils/formatCurrency';
import { payslipPdfViewerParams } from '@/utils/payslipNavigation';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminPayrollStackParamList, 'PayslipsManagement'>;

function PayslipManagementRow({
  item,
  onReview,
  onViewPdf,
}: {
  item: PayrollDashboardEntry;
  onReview: () => void;
  onViewPdf: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.name}>{item.officerName}</Text>
        <Text style={styles.meta}>
          {item.status} ·{' '}
          {item.netPayPreview != null ? formatCurrencyInrPrecise(item.netPayPreview) : '—'}
        </Text>
      </View>
      <View style={styles.rowActions}>
        <Button label="Review" variant="ghost" onPress={onReview} />
        {item.generatedPdfUrl ? (
          <Button label="View PDF" variant="secondary" onPress={onViewPdf} />
        ) : null}
      </View>
    </View>
  );
}

export function PayslipsManagementScreen({ navigation }: Props) {
  const now = new Date();
  const { data, isLoading, isError, error, refetch } = useGetPayrollDashboardQuery({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });

  const openReview = useCallback(
    (item: PayrollDashboardEntry) => {
      if (!item.payslipId) return;
      const d = new Date();
      const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const endDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
      navigation.navigate('PayslipReview', {
        officerId: item.officerId,
        periodStart: start,
        periodEnd: end,
        payslipId: item.payslipId,
      });
    },
    [navigation],
  );

  const openPdf = useCallback(
    (item: PayrollDashboardEntry) => {
      const params = payslipPdfViewerParams({
        generatedPdfUrl: item.generatedPdfUrl,
        payPeriodLabel: item.payPeriodLabel ?? 'Payslip',
        employeeName: item.officerName,
      });
      if (!params) {
        Alert.alert('No PDF', 'Generate the payslip PDF from the review screen first.');
        return;
      }
      navigation.navigate('PayslipPdfViewer', params);
    },
    [navigation],
  );

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={8} />
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

  const withPayslips = (data ?? []).filter((e) => e.payslipId);

  return (
    <RoleGuard requiredPermission="payroll.view">
      <Screen padded={false}>
        <FlatList
          data={withPayslips}
          keyExtractor={(r) => r.payslipId!}
          ListEmptyComponent={
            <Text style={styles.empty}>No payslips for the current month</Text>
          }
          renderItem={({ item }) => (
            <PayslipManagementRow
              item={item}
              onReview={() => openReview(item)}
              onViewPdf={() => openPdf(item)}
            />
          )}
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
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
