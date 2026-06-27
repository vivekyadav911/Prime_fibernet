import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AdminButton, AdminScreenLayout, FilterChips, RoleGuard, StatusBadge } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { PayrollMonthYearPicker } from '@/components/payroll/PayrollMonthYearPicker';
import { PayrollWarningBadges } from '@/components/payroll/PayrollWarningBadges';
import { usePayrollDashboard } from '@/hooks/usePayrollDashboard';
import { useBulkApprovePayslipsMutation } from '@/services/api/payrollApi';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminPayrollStackParamList } from '@/types/navigation';
import type { PayrollDashboardEntry, PayslipStatus } from '@/types/payslip';
import { formatCurrencyInrPrecise } from '@/utils/formatCurrency';
import { payslipPdfViewerParams } from '@/utils/payslipNavigation';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminPayrollStackParamList, 'PayrollHome'>;

type StatusFilter = 'all' | PayslipStatus | 'not_started';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'not_started', label: 'Not started' },
  { key: 'draft', label: 'Draft' },
  { key: 'needs_review', label: 'Needs review' },
  { key: 'flagged_zero_pay', label: 'Zero pay' },
  { key: 'approved', label: 'Approved' },
];

export function PayrollScreen({ navigation }: Props) {
  const {
    month,
    year,
    setPeriod,
    period,
    entries,
    isLoading,
    isError,
    error,
    refetch,
    triggerBulkGenerate,
    isGenerating,
  } = usePayrollDashboard();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [bulkApprove, { isLoading: isBulkApproving }] = useBulkApprovePayslipsMutation();

  const filteredEntries = useMemo(() => {
    if (statusFilter === 'all') return entries;
    return entries.filter((e) => e.status === statusFilter);
  }, [entries, statusFilter]);

  const openPreGeneration = useCallback(
    (item: PayrollDashboardEntry) => {
      navigation.navigate('PayslipPreGeneration', {
        officerId: item.officerId,
        officerName: item.officerName,
        periodStart: item.payPeriodStart,
        periodEnd: item.payPeriodEnd,
        payslipId: item.payslipId ?? undefined,
      });
    },
    [navigation],
  );

  const openReview = useCallback(
    (item: PayrollDashboardEntry) => {
      if (!item.payslipId) return;
      navigation.navigate('PayslipReview', {
        officerId: item.officerId,
        officerName: item.officerName,
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

  const handleGenerateAll = useCallback(async () => {
    const candidates = entries.filter(
      (e) =>
        (e.status === 'not_started' || e.status === 'draft') &&
        !e.blocked &&
        e.attendanceSummary.canGenerate,
    );
    if (!candidates.length) {
      Alert.alert('Nothing ready', 'No officers pass pre-generation validation this period.');
      return;
    }
    Alert.alert(
      'Generate all',
      `${candidates.length} officer(s) passed validation. Each will be generated via calculatePayslip(). Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            const results = await triggerBulkGenerate(candidates.map((e) => e.officerId));
            const ok = results.filter(
              (r) => r.status === 'fulfilled' && r.value.payslipId && !r.value.blocked,
            ).length;
            Alert.alert('Bulk complete', `${ok} of ${candidates.length} generated.`);
            void refetch();
          },
        },
      ],
    );
  }, [entries, triggerBulkGenerate, refetch]);

  const handleBulkApprove = useCallback(async () => {
    const approvable = entries.filter(
      (e) =>
        e.payslipId &&
        ['draft', 'pending_review', 'needs_review', 'flagged_zero_pay'].includes(e.status) &&
        !e.warningCodes.includes('zero_pay') &&
        !e.blocked,
    );
    if (!approvable.length) {
      Alert.alert('Nothing to approve', 'No eligible draft payslips without blocking warnings.');
      return;
    }
    Alert.prompt?.(
      'Bulk approve',
      'Enter authorized signatory name',
      async (name) => {
        if (!name?.trim()) return;
        const result = await bulkApprove({
          payslipIds: approvable.map((e) => e.payslipId!),
          signatureName: name.trim(),
        }).unwrap();
        Alert.alert(
          'Bulk approve complete',
          `${result.approved.length} approved, ${result.failed.length} failed.`,
        );
        void refetch();
      },
      'plain-text',
    );
    if (!Alert.prompt) {
      Alert.alert(
        'Bulk approve',
        'Bulk approve requires platform prompt support. Approve payslips individually from Review.',
      );
    }
  }, [bulkApprove, entries, refetch]);

  const listHeader = (
    <View style={adminScreenStyles.listHeader}>
      <View style={styles.toolbar}>
        <PayrollMonthYearPicker
          month={month}
          year={year}
          onChange={(m, y) => setPeriod(m, y)}
        />
        <View style={styles.toolbarActions}>
          <AdminButton
            label="Settings"
            variant="ghost"
            onPress={() => navigation.navigate('PayslipSettings')}
          />
          <AdminButton
            label="Generate all"
            variant="secondary"
            onPress={() => void handleGenerateAll()}
            disabled={isGenerating}
          />
          <AdminButton
            label="Bulk approve"
            variant="secondary"
            onPress={() => void handleBulkApprove()}
            disabled={isBulkApproving}
          />
        </View>
        <FilterChips
          options={STATUS_FILTERS.map((f) => ({ value: f.key, label: f.label }))}
          selected={statusFilter}
          onSelect={(v) => setStatusFilter(v)}
        />
      </View>
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

  return (
    <RoleGuard requiredPermission="payroll.view">
      <AdminScreenLayout padded={false}>
        <FlatList
          data={filteredEntries}
          keyExtractor={(r) => r.officerId}
          ListHeaderComponent={listHeader}
          contentContainerStyle={adminScreenStyles.listContent}
          style={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.card, item.warningCodes.length ? styles.cardWarn : null]}>
              <View style={styles.rowHeader}>
                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>
                      {item.officerName.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.rowMain}>
                  <Text style={styles.name}>{item.officerName}</Text>
                  <Text style={styles.attendanceMeta}>
                    P {item.attendanceSummary.present} · A {item.attendanceSummary.absent} · L{' '}
                    {item.attendanceSummary.leave} · U {item.attendanceSummary.unresolved}
                  </Text>
                  <PayrollWarningBadges codes={item.warningCodes} />
                </View>
                <StatusBadge status={item.status} />
              </View>

              {item.netPayPreview != null ? (
                <Text style={styles.net}>Net {formatCurrencyInrPrecise(item.netPayPreview)}</Text>
              ) : null}

              <View style={styles.actions}>
                {item.payslipId ? (
                  <>
                    <AdminButton label="Review" variant="primary" onPress={() => openReview(item)} />
                    {item.generatedPdfUrl ? (
                      <AdminButton label="View PDF" variant="secondary" onPress={() => openPdf(item)} />
                    ) : null}
                    <AdminButton
                      label="Regenerate"
                      variant="ghost"
                      onPress={() => openPreGeneration(item)}
                    />
                  </>
                ) : (
                  <AdminButton
                    label={item.blocked ? 'Fix issues' : 'Generate'}
                    variant="secondary"
                    onPress={() => openPreGeneration(item)}
                  />
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No officers match this filter</Text>}
          showsVerticalScrollIndicator={false}
        />
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  toolbar: { gap: spacing.sm },
  toolbarActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardWarn: { borderColor: colors.warningAmber },
  rowHeader: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    backgroundColor: adminColors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: adminColors.primary, fontWeight: '700' },
  rowMain: { flex: 1, gap: spacing.xxs },
  name: { fontWeight: '700', color: colors.textPrimary, fontSize: 15 },
  attendanceMeta: { fontSize: 11, color: colors.textSecondary },
  net: { fontWeight: '700', color: adminColors.primary, fontSize: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  empty: { textAlign: 'center', color: colors.textSecondary, padding: spacing.lg },
});
