import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '@prime/ui';

import { AdminButton, AdminScreenLayout, AdminStateShell, RoleGuard } from '@/components/admin';
import {
  useCalculatePayslipMutation,
  useGetPayrollGenerationPreviewQuery,
} from '@/services/api/payrollApi';
import type { AttendanceIssueCategory } from '@/services/payslip/calculatePayslipCore';
import { formatCompensationRange } from '@/services/payslip/payslipValidation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminPayrollStackParamList } from '@/types/navigation';
import { ISSUE_CATEGORY_META } from '@/utils/attendanceIssueLabels';
import { formatCurrencyInrPrecise } from '@/utils/formatCurrency';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminPayrollStackParamList, 'PayslipPreGeneration'>;

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

function IssueCategoryCard({
  category,
  count,
  onFix,
}: {
  category: AttendanceIssueCategory;
  count: number;
  onFix: () => void;
}) {
  const meta = ISSUE_CATEGORY_META[category];
  const actionLabel =
    category === 'no_shift_assigned'
      ? 'Assign shift'
      : category === 'no_check_in'
        ? 'Fix missing check-ins'
        : 'Complete check-outs';

  return (
    <View style={[styles.issueCard, styles[`issue_${meta.accent}`]]}>
      <View style={styles.issueHeader}>
        <Text style={styles.issueTitle}>{meta.title}</Text>
        <View style={styles.issueCountPill}>
          <Text style={styles.issueCountText}>{count}</Text>
        </View>
      </View>
      <Text style={styles.issueDesc}>{meta.description}</Text>
      <Button label={actionLabel} variant="secondary" onPress={onFix} />
    </View>
  );
}

export function PayslipPreGenerationScreen({ route, navigation }: Props) {
  const { officerId, officerName, periodStart, periodEnd, payslipId } = route.params;
  const { data, isLoading, isError, error, refetch } = useGetPayrollGenerationPreviewQuery({
    officerId,
    payPeriodStart: periodStart,
    payPeriodEnd: periodEnd,
  });
  const [calculatePayslip, { isLoading: isGenerating }] = useCalculatePayslipMutation();
  const [generateError, setGenerateError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refetch();
      setGenerateError(null);
    }, [refetch]),
  );

  const openTriage = useCallback(
    (focusCategory?: AttendanceIssueCategory) => {
      navigation.navigate('PayslipAttendanceTriage', {
        officerId,
        officerName,
        periodStart,
        periodEnd,
        payslipId,
        focusCategory,
        returnTo: 'pregeneration',
      });
    },
    [navigation, officerId, officerName, payslipId, periodEnd, periodStart],
  );

  const handleGenerate = useCallback(
    async (overwrite = false) => {
      if (!data?.canGenerate) {
        setGenerateError(
          data?.warnings.join('\n') || 'Resolve attendance and officer profile issues first.',
        );
        return;
      }

      setGenerateError(null);

      const runGeneration = async (forceOverwriteDraft: boolean) =>
        calculatePayslip({
          officerId,
          payPeriodStart: periodStart,
          payPeriodEnd: periodEnd,
          forceOverwriteDraft,
        }).unwrap();

      const finish = (result: Awaited<ReturnType<typeof runGeneration>>) => {
        if (result.blocked) {
          setGenerateError(
            `Incomplete attendance on: ${result.blockingDates.join(', ') || 'unknown dates'}`,
          );
          return;
        }
        if (!result.payslipId) {
          setGenerateError('Generation completed but no payslip was returned. Please retry.');
          return;
        }
        navigation.replace('PayslipReview', {
          officerId,
          periodStart,
          periodEnd,
          payslipId: result.payslipId,
        });
      };

      try {
        let result = await runGeneration(overwrite || Boolean(payslipId));
        if (!result.payslipId && !result.blocked && !overwrite) {
          result = await runGeneration(true);
        }
        finish(result);
      } catch (e) {
        const msg = queryErrorMessage(e);
        if (msg.includes('force_overwrite_draft') || msg.includes('Draft payslip exists')) {
          try {
            finish(await runGeneration(true));
            return;
          } catch (retryErr) {
            setGenerateError(queryErrorMessage(retryErr));
            return;
          }
        }
        setGenerateError(msg);
      }
    },
    [data, navigation, officerId, payslipId, periodEnd, periodStart, calculatePayslip],
  );

  const summary = data?.attendanceSummary;
  const issueSummary = summary?.issueSummary;
  const hasAttendanceIssues = issueSummary
    ? issueSummary.noShiftAssigned ||
      issueSummary.noCheckInCount > 0 ||
      issueSummary.incompleteCount > 0
    : false;
  const profileWarnings = (data?.warnings ?? []).filter(
    (w) => !w.includes('check-in') && !w.includes('check-out') && !w.includes('shift schedule'),
  );
  const compensationNotices = data?.compensationNotices ?? [];

  return (
    <RoleGuard requiredPermission="payroll.edit">
      <AdminStateShell
        isLoading={isLoading}
        isError={isError || !data}
        error={error}
        onRetry={refetch}
        loadingRows={8}
      >
        {data && summary ? (
          <AdminScreenLayout padded={false}>
            <ScrollView contentContainerStyle={styles.scroll}>
              <View style={styles.headerCard}>
                <Text style={styles.title}>{officerName}</Text>
                <Text style={styles.subtitle}>{data.periodLabel}</Text>
                <Text style={styles.hint}>
                  Attendance counts below are sourced directly from the Attendance module for this pay
                  period. Review before generating the payslip snapshot.
                </Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Attendance summary</Text>
                <View style={styles.statsGrid}>
                  <StatCell label="Present" value={summary.present} />
                  <StatCell label="Absent" value={summary.absent} />
                  <StatCell label="Leave" value={summary.leave} />
                  <StatCell label="Holiday" value={summary.holiday} />
                  <StatCell label="Weekly off" value={summary.weeklyOff} />
                  <StatCell label="Unresolved" value={summary.unresolved} />
                </View>
              </View>

              {hasAttendanceIssues ? (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Attendance issues</Text>
                  <Text style={styles.issueIntro}>
                    Each category has a distinct cause and remediation. Fix them inline without leaving
                    payroll.
                  </Text>

                  {issueSummary!.noShiftAssigned ? (
                    <IssueCategoryCard
                      category="no_shift_assigned"
                      count={1}
                      onFix={() => openTriage('no_shift_assigned')}
                    />
                  ) : null}

                  {issueSummary!.noCheckInCount > 0 ? (
                    <IssueCategoryCard
                      category="no_check_in"
                      count={issueSummary!.noCheckInCount}
                      onFix={() => openTriage('no_check_in')}
                    />
                  ) : null}

                  {issueSummary!.incompleteCount > 0 ? (
                    <IssueCategoryCard
                      category="check_in_without_check_out"
                      count={issueSummary!.incompleteCount}
                      onFix={() => openTriage('check_in_without_check_out')}
                    />
                  ) : null}

                  <Button label="Open full triage view" variant="ghost" onPress={() => openTriage()} />
                </View>
              ) : null}

              {data.contractCompensations?.length ? (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Contract salary</Text>
                  {data.contractCompensations.map((term) => (
                    <Text key={term.id} style={styles.contractSalary}>
                      {formatCurrencyInrPrecise(term.monthlySalary)}/mo —{' '}
                      {formatCompensationRange(term.effectiveFrom, term.effectiveTo)}
                    </Text>
                  ))}
                  <Text style={styles.hint}>
                    Payslip calculation uses this employment contract record only.
                  </Text>
                </View>
              ) : null}

              {profileWarnings.length ? (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Blockers</Text>
                  {profileWarnings.map((w) => (
                    <Text key={w} style={styles.warningText}>
                      • {w}
                    </Text>
                  ))}
                </View>
              ) : null}

              {compensationNotices.length ? (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Notes</Text>
                  {compensationNotices.map((notice) => (
                    <Text key={notice} style={styles.noteText}>
                      • {notice}
                    </Text>
                  ))}
                </View>
              ) : null}

              <View style={styles.actions}>
                {generateError ? <Text style={styles.generateError}>{generateError}</Text> : null}
                <AdminButton label="Back" variant="ghost" onPress={() => navigation.goBack()} />
                <AdminButton
                  label={
                    isGenerating
                      ? 'Generating payslip…'
                      : data.canGenerate
                        ? 'Generate payslip'
                        : 'Blocked — fix issues first'
                  }
                  variant="primary"
                  onPress={() => void handleGenerate()}
                  disabled={!data.canGenerate || isGenerating}
                />
              </View>
            </ScrollView>
          </AdminScreenLayout>
        ) : null}
      </AdminStateShell>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  headerCard: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xxs,
  },
  title: { fontSize: 18, fontWeight: '700', color: adminColors.primary },
  subtitle: { fontSize: 13, color: colors.textSecondary },
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.sm,
  },
  sectionTitle: { fontWeight: '700', fontSize: 14, color: adminColors.primary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCell: {
    minWidth: 72,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    alignItems: 'center',
  },
  statVal: { fontWeight: '700', fontSize: 16, color: colors.textPrimary },
  statLbl: { fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase' },
  issueIntro: { fontSize: 12, color: colors.textSecondary },
  issueCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  issue_error: { borderColor: colors.errorRed, backgroundColor: colors.redLight },
  issue_warning: { borderColor: colors.warningAmber, backgroundColor: colors.amberLight },
  issue_info: { borderColor: adminColors.primary, backgroundColor: adminColors.primaryTint },
  issueHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  issueTitle: { fontWeight: '700', fontSize: 13, color: adminColors.primary, flex: 1 },
  issueCountPill: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.full,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  issueCountText: { fontWeight: '700', fontSize: 12, color: adminColors.primary },
  issueDesc: { fontSize: 11, color: colors.textSecondary },
  warningText: { fontSize: 12, color: colors.errorRed },
  noteText: { fontSize: 12, color: colors.textSecondary },
  contractSalary: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  generateError: {
    fontSize: 12,
    color: colors.errorRed,
    backgroundColor: colors.redLight,
    borderWidth: 1,
    borderColor: colors.errorRed,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
