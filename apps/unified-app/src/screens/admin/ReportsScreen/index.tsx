import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AdminScreenLayout, AdminKPICard, DateRangePicker, ExportButton, RoleGuard, SectionCard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import {
  useExportSettingsXlsxMutation,
  useGetOfficerPerformanceReportQuery,
  useGetPlanDistributionQuery,
  useGetReportKpisQuery,
  useGetRequestBreakdownQuery,
  useGetRevenueByMonthQuery,
} from '@/store/api/endpoints';
import { adminColors } from '@/theme/admin';
import { adminDesign } from '@/theme/adminDesign';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';
import { shareBlob } from '@/utils/shareFile';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';

export function ReportsScreen() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data: kpis, isLoading, isError, error, refetch } = useGetReportKpisQuery({ from, to });
  const { data: revenue } = useGetRevenueByMonthQuery({ from, to });
  const { data: plans } = useGetPlanDistributionQuery();
  const { data: officers } = useGetOfficerPerformanceReportQuery({ from, to });
  const { data: requests } = useGetRequestBreakdownQuery({ from, to });
  const [exportXlsx] = useExportSettingsXlsxMutation();
  const dispatch = useAppDispatch();

  const runExport = async () => {
    try {
      const result = await exportXlsx({ action: 'export_reports' }).unwrap();
      await shareBlob(result.blob, result.filename);
    } catch (e) {
      dispatch(
        enqueueToast({
          id: Date.now().toString(),
          type: 'error',
          message: queryErrorMessage(e),
        }),
      );
    }
  };

  if (isLoading) {
    return (
      <AdminScreenLayout scroll>
        <SkeletonLoader rows={8} shape="card" />
      </AdminScreenLayout>
    );
  }

  if (isError) {
    return (
      <AdminScreenLayout scroll>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </AdminScreenLayout>
    );
  }

  return (
    <RoleGuard requiredPermission="reports.view">
      <AdminScreenLayout scroll contentStyle={styles.page}>
        <Text style={styles.title}>Reports</Text>
        <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
        <View style={styles.kpiRow}>
          <AdminKPICard label="Revenue MTD" value={`₹${kpis?.totalRevenueMtd ?? 0}`} />
          <AdminKPICard label="New Customers" value={kpis?.newCustomersMtd ?? 0} />
          <AdminKPICard label="Active Subs" value={kpis?.activeSubscriptions ?? 0} />
          <AdminKPICard label="SLA %" value={`${kpis?.slaCompliancePercent ?? 0}%`} />
        </View>

        <SectionCard title="Revenue by month">
          {(revenue ?? []).slice(-6).map((r) => (
            <View key={r.month} style={styles.barRow}>
              <Text style={styles.barLabel}>{r.month}</Text>
              <View style={[styles.bar, { width: Math.min(200, r.revenue / 1000) }]} />
              <Text style={styles.barVal}>₹{r.revenue}</Text>
            </View>
          ))}
        </SectionCard>

        <SectionCard title="Plan distribution">
          {(plans ?? []).map((p) => (
            <Text key={p.planName} style={styles.line}>
              {p.planName}: {p.count}
            </Text>
          ))}
        </SectionCard>

        <SectionCard title="Officer performance">
          {(officers ?? []).map((o) => (
            <Text key={o.officerName} style={styles.line}>
              {o.officerName}: {o.completed} done · {o.avgHours}h avg
            </Text>
          ))}
        </SectionCard>

        <SectionCard title="Request breakdown">
          {(requests ?? []).map((r) => (
            <Text key={r.type} style={styles.line}>
              {r.type}: {r.count}
            </Text>
          ))}
        </SectionCard>

        <View style={styles.exportRow}>
          <ExportButton format="csv" label="Export Excel" onExport={runExport} />
        </View>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: spacing.md,
  },
  title: {
    ...adminDesign.typography.pageTitle,
    marginBottom: spacing.xs,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  barLabel: {
    width: 60,
    fontSize: 11,
    color: colors.textSecondary,
  },
  bar: {
    height: 12,
    backgroundColor: adminColors.primary,
    borderRadius: 4,
  },
  barVal: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  line: {
    fontSize: 13,
    color: colors.textSecondary,
    paddingVertical: 2,
  },
  exportRow: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
