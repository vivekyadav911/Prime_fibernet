import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AdminButton, AdminScreenLayout, FilterChips, RoleGuard, StatusBadge } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { PayrollMonthYearPicker } from '@/components/payroll/PayrollMonthYearPicker';
import { PayrollWarningBadges } from '@/components/payroll/PayrollWarningBadges';
import { usePayrollDashboard } from '@/hooks/usePayrollDashboard';
import { useBulkApprovePayslipsMutation, useVoidPayslipMutation } from '@/services/api/payrollApi';
import { fixIssuesLabel } from '@/services/payroll/attendancePeriodDiagnostics';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminPayrollStackParamList } from '@/types/navigation';
import type { PayrollDashboardEntry, PayslipStatus } from '@/types/payslip';
import { formatCurrencyInrPrecise } from '@/utils/formatCurrency';
import {
  canReviewPayslip,
  hasInvalidSnapshot,
  shouldShowNetPay,
} from '@/utils/payrollDashboardActions';
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
  const [voidPayslip, { isLoading: isVoiding }] = useVoidPayslipMutation();

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

  const openFixIssues = useCallback(
    (item: PayrollDashboardEntry) => {
      const hasAttendanceBlockers =
        item.attendanceSummary.issueSummary.noShiftAssigned ||
        item.attendanceSummary.issueSummary.noCheckInCount > 0 ||
        item.attendanceSummary.issueSummary.incompleteCount > 0;

      if (
        hasAttendanceBlockers &&
        item.missingOfficerFields.length === 0 &&
        item.hasCompensation
      ) {
        navigation.navigate('PayslipAttendanceTriage', {
          officerId: item.officerId,
          officerName: item.officerName,
          periodStart: item.payPeriodStart,
          periodEnd: item.payPeriodEnd,
          payslipId: item.payslipId ?? undefined,
          returnTo: 'payroll_home',
        });
        return;
      }
      openPreGeneration(item);
    },
    [navigation, openPreGeneration],
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

  const handleVoidInvalid = useCallback(
    (item: PayrollDashboardEntry) => {
      if (!item.payslipId) return;
      Alert.alert(
        'Void invalid payslip',
        'This payslip snapshot is inconsistent and cannot be reviewed. Void it to clear stale totals before regenerating.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Void payslip',
            style: 'destructive',
            onPress: () => {
              void voidPayslip({
                payslipId: item.payslipId!,
                reason: 'snapshot_invalid — cleared from payroll list',
              })
                .unwrap()
                .then(() => {
                  Alert.alert('Voided', 'Invalid payslip removed. Use Fix issues to regenerate.');
                  void refetch();
                })
                .catch((e) =>
                  Alert.alert('Error', e instanceof Error ? e.message : 'Void failed'),
                );
            },
          },
        ],
      );
    },
    [refetch, voidPayslip],
  );

  const listHeader = (
    <View style={adminScreenStyles.listHeader}>
      <View style={styles.toolbar}>
        <PayrollMonthYearPicker month={month} year={year} onChange={(m, y) => setPeriod(m, y)} />
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
          renderItem={({ item }) => {
            const reviewReady = canReviewPayslip(item);
            const invalidSnapshot = hasInvalidSnapshot(item);

            return (
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

                {shouldShowNetPay(item) ? (
                  <Text style={styles.net}>Net {formatCurrencyInrPrecise(item.netPayPreview!)}</Text>
                ) : invalidSnapshot && item.netPayPreview != null ? (
                  <Text style={styles.netInvalid}>Totals invalid — regenerate required</Text>
                ) : null}

                <View style={styles.actions}>
                  {reviewReady ? (
                    <>
                      <AdminButton label="Review" variant="primary" onPress={() => openReview(item)} />
                      {item.generatedPdfUrl ? (
                        <AdminButton
                          label="View PDF"
                          variant="secondary"
                          onPress={() => openPdf(item)}
                        />
                      ) : null}
                      <AdminButton
                        label="Regenerate"
                        variant="ghost"
                        onPress={() => openPreGeneration(item)}
                      />
                    </>
                  ) : item.payslipId ? (
                    <>
                      <AdminButton
                        label={item.blocked ? fixIssuesLabel(item.fixIssuesHint) : 'Regenerate'}
                        variant="primary"
                        onPress={() =>
                          item.blocked ? openFixIssues(item) : openPreGeneration(item)
                        }
                      />
                      {invalidSnapshot ? (
                        <AdminButton
                          label="Void invalid"
                          variant="ghost"
                          onPress={() => handleVoidInvalid(item)}
                          disabled={isVoiding}
                        />
                      ) : null}
                    </>
                  ) : (
                    <AdminButton
                      label={item.blocked ? fixIssuesLabel(item.fixIssuesHint) : 'Generate'}
                      variant="secondary"
                      onPress={() => (item.blocked ? openFixIssues(item) : openPreGeneration(item))}
                    />
                  )}
                </View>
              </View>
            );
          }}
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
  netInvalid: { fontWeight: '600', color: colors.errorRed, fontSize: 13 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  empty: { textAlign: 'center', color: colors.textSecondary, padding: spacing.lg },
});
