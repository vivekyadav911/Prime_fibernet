import { useCallback, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Screen } from '@prime/ui';

import { FormField, RoleGuard, SelectField } from '@/components/admin';
import { DismissKeyboardScrollView } from '@/components/common';
import { ErrorState, SkeletonLoader } from '@/components/common';
import {
  useBulkPayrollAttendanceOverrideMutation,
  useCompletePayrollCheckOutMutation,
  useGetPayrollCompensationForOfficerQuery,
  useGetPayrollGenerationPreviewQuery,
  useGetPayrollTriageAuditLogQuery,
  useGetPayTypeRulesQuery,
  useResolvePayrollAttendanceDayMutation,
} from '@/services/api/payrollApi';
import type {
  AttendanceDayIssue,
  AttendanceIssueCategory,
} from '@/services/payslip/calculatePayslipCore';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminPayrollStackParamList } from '@/types/navigation';
import { formatIssueDate, ISSUE_CATEGORY_META } from '@/utils/attendanceIssueLabels';
import { formatCurrencyInrPrecise } from '@/utils/formatCurrency';
import {
  BULK_OVERRIDE_STATUS_OPTIONS,
  estimateBulkOverridePayImpact,
  type BulkOverrideStatusChoice,
} from '@/services/payroll/bulkOverrideEstimate';
import { DEFAULT_SHIFT } from '@/services/payroll/payrollDashboardBuilder';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminPayrollStackParamList, 'PayslipAttendanceTriage'>;

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'on_leave', label: 'Leave' },
  { value: 'holiday', label: 'Holiday' },
];

const BULK_STATUS_OPTIONS = BULK_OVERRIDE_STATUS_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}));

type ResolveModalState = {
  issue: AttendanceDayIssue;
  mode: 'status' | 'checkout';
};

export function PayslipAttendanceTriageScreen({ route, navigation }: Props) {
  const {
    officerId,
    officerName,
    periodStart,
    periodEnd,
    payslipId,
    focusCategory,
    returnTo,
  } = route.params;

  const { data, isLoading, isError, error, refetch } = useGetPayrollGenerationPreviewQuery({
    officerId,
    payPeriodStart: periodStart,
    payPeriodEnd: periodEnd,
  });
  const { data: payRules } = useGetPayTypeRulesQuery();
  const { data: compensationData } = useGetPayrollCompensationForOfficerQuery({ officerId });
  const { data: auditLog, refetch: refetchAudit } = useGetPayrollTriageAuditLogQuery({
    officerId,
    payPeriodStart: periodStart,
    payPeriodEnd: periodEnd,
  });

  const [resolveDay, { isLoading: isResolving }] = useResolvePayrollAttendanceDayMutation();
  const [completeCheckOut, { isLoading: isCompleting }] = useCompletePayrollCheckOutMutation();
  const [bulkOverride, { isLoading: isBulkSaving }] = useBulkPayrollAttendanceOverrideMutation();

  const [resolveModal, setResolveModal] = useState<ResolveModalState | null>(null);
  const [resolveStatus, setResolveStatus] = useState('absent');
  const [resolveReason, setResolveReason] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('18:00');
  const [resolveError, setResolveError] = useState<string | null>(null);

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStep, setBulkStep] = useState<'choose' | 'confirm'>('choose');
  const [bulkChoice, setBulkChoice] = useState<BulkOverrideStatusChoice | ''>('');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refetch();
      void refetchAudit();
    }, [refetch, refetchAudit]),
  );

  const issueSummary = data?.attendanceSummary.issueSummary;

  const bulkPayEstimate = useMemo(() => {
    if (!bulkChoice || !issueSummary?.noCheckInDates.length || !data || !compensationData?.compensations.length) {
      return null;
    }
    return estimateBulkOverridePayImpact({
      dates: issueSummary.noCheckInDates,
      choice: bulkChoice,
      compensations: compensationData.compensations,
      shiftDefinition: data.shiftDefinition ?? DEFAULT_SHIFT,
      payRules: (payRules ?? []).map((rule) => ({
        attendanceStatus: rule.attendanceStatus,
        payFraction: rule.payFraction,
        usesScheduledHours: rule.usesScheduledHours,
      })),
    });
  }, [bulkChoice, compensationData, data, issueSummary, payRules]);

  const groupedIssues = useMemo(() => {
    if (!issueSummary) return [];
    const groups: { category: AttendanceIssueCategory; issues: AttendanceDayIssue[] }[] = [];

    if (issueSummary.noShiftAssigned) {
      groups.push({ category: 'no_shift_assigned', issues: [] });
    }

    const byCategory = (cat: AttendanceIssueCategory) =>
      issueSummary.issues.filter((i: AttendanceDayIssue) => i.category === cat);

    const noCheckIn = byCategory('no_check_in');
    if (noCheckIn.length) groups.push({ category: 'no_check_in', issues: noCheckIn });

    const incomplete = byCategory('check_in_without_check_out');
    if (incomplete.length) groups.push({ category: 'check_in_without_check_out', issues: incomplete });

    if (focusCategory) {
      return groups.filter((g) => g.category === focusCategory);
    }
    return groups;
  }, [focusCategory, issueSummary]);

  const buildIsoTime = useCallback((date: string, time: string) => {
    const [hours, minutes] = time.split(':');
    const dt = new Date(date);
    dt.setHours(Number(hours), Number(minutes), 0, 0);
    return dt.toISOString();
  }, []);

  const openResolve = useCallback((issue: AttendanceDayIssue) => {
    setResolveError(null);
    setResolveReason('');
    if (issue.category === 'check_in_without_check_out') {
      setCheckOutTime('18:00');
      setResolveModal({ issue, mode: 'checkout' });
    } else {
      setResolveStatus('absent');
      setResolveModal({ issue, mode: 'status' });
    }
  }, []);

  const handleResolveSubmit = useCallback(async () => {
    if (!resolveModal) return;
    if (!resolveReason.trim()) {
      setResolveError('A reason is required for manual corrections');
      return;
    }
    setResolveError(null);
    try {
      if (resolveModal.mode === 'checkout' && resolveModal.issue.shiftRecordId) {
        await completeCheckOut({
          officerId,
          shiftId: resolveModal.issue.shiftRecordId,
          date: resolveModal.issue.date,
          payPeriodStart: periodStart,
          payPeriodEnd: periodEnd,
          checkOut: buildIsoTime(resolveModal.issue.date, checkOutTime),
          reason: resolveReason.trim(),
        }).unwrap();
      } else {
        await resolveDay({
          officerId,
          date: resolveModal.issue.date,
          payPeriodStart: periodStart,
          payPeriodEnd: periodEnd,
          status: resolveStatus,
          reason: resolveReason.trim(),
          resolutionType: 'triage_correction',
        }).unwrap();
      }
      setResolveModal(null);
      void refetch();
      void refetchAudit();
    } catch (e) {
      setResolveError(queryErrorMessage(e));
    }
  }, [
    buildIsoTime,
    checkOutTime,
    completeCheckOut,
    officerId,
    periodEnd,
    periodStart,
    refetch,
    refetchAudit,
    resolveDay,
    resolveModal,
    resolveReason,
    resolveStatus,
  ]);

  const handleBulkSubmit = useCallback(async () => {
    if (!issueSummary?.noCheckInDates.length || !bulkChoice) return;
    if (!bulkReason.trim()) {
      setBulkError('A reason is required for admin override');
      return;
    }
    setBulkError(null);
    setBulkSuccess(null);
    try {
      const result = await bulkOverride({
        officerId,
        dates: issueSummary.noCheckInDates,
        payPeriodStart: periodStart,
        payPeriodEnd: periodEnd,
        choice: bulkChoice,
        reason: bulkReason.trim(),
      }).unwrap();
      setShowBulkModal(false);
      setBulkStep('choose');
      setBulkChoice('');
      setBulkReason('');
      setBulkSuccess(`Admin override applied to ${result.resolved} day(s).`);
      void refetch();
      void refetchAudit();
    } catch (e) {
      setBulkError(queryErrorMessage(e));
    }
  }, [
    bulkChoice,
    bulkOverride,
    bulkReason,
    issueSummary,
    officerId,
    periodEnd,
    periodStart,
    refetch,
    refetchAudit,
  ]);

  const handleDone = useCallback(() => {
    if (returnTo === 'pregeneration') {
      navigation.goBack();
      return;
    }
    navigation.navigate('PayslipPreGeneration', {
      officerId,
      officerName,
      periodStart,
      periodEnd,
      payslipId,
    });
  }, [navigation, officerId, officerName, payslipId, periodEnd, periodStart, returnTo]);

  const openShiftManagement = useCallback(() => {
    navigation.getParent()?.navigate('Attendance', { screen: 'ShiftManagement' });
  }, [navigation]);

  if (isLoading) {
    return (
      <Screen style={adminScreenStyles.canvas}>
        <SkeletonLoader rows={10} />
      </Screen>
    );
  }

  if (isError || !data || !issueSummary) {
    return (
      <Screen style={adminScreenStyles.canvas}>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  const remainingCount =
    issueSummary.noCheckInCount + issueSummary.incompleteCount + (issueSummary.noShiftAssigned ? 1 : 0);

  return (
    <RoleGuard requiredPermission="payroll.edit">
      <Screen padded={false} style={adminScreenStyles.canvas}>
        <DismissKeyboardScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.headerCard}>
            <Text style={styles.title}>{officerName}</Text>
            <Text style={styles.subtitle}>{data.periodLabel} · Attendance triage</Text>
            <Text style={styles.hint}>
              Resolve only the problem days for this pay period. Corrections are written to the payroll
              audit trail and tagged separately from device check-ins.
            </Text>
            {remainingCount === 0 ? (
              <Text style={styles.resolvedBanner}>All blocking attendance issues are resolved.</Text>
            ) : (
              <Text style={styles.countBanner}>
                {remainingCount} issue group(s) remaining before generation can proceed.
              </Text>
            )}
            {bulkSuccess ? <Text style={styles.resolvedBanner}>{bulkSuccess}</Text> : null}
          </View>

          {groupedIssues.map((group) => {
            const meta = ISSUE_CATEGORY_META[group.category];
            const count =
              group.category === 'no_shift_assigned'
                ? 1
                : group.category === 'no_check_in'
                  ? issueSummary.noCheckInCount
                  : issueSummary.incompleteCount;

            return (
              <View key={group.category} style={[styles.categoryCard, styles[`card_${meta.accent}`]]}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryTitle}>{meta.title}</Text>
                  <View style={styles.countPill}>
                    <Text style={styles.countPillText}>{count}</Text>
                  </View>
                </View>
                <Text style={styles.categoryDesc}>{meta.description}</Text>

                {group.category === 'no_shift_assigned' ? (
                  <Button
                    label="Assign shift schedule"
                    variant="secondary"
                    onPress={openShiftManagement}
                  />
                ) : null}

                {group.issues.map((issue) => (
                  <View key={`${issue.date}-${issue.category}`} style={styles.dayRow}>
                    <View style={styles.dayMain}>
                      <Text style={styles.dayDate}>{formatIssueDate(issue.date)}</Text>
                      {issue.checkInTime ? (
                        <Text style={styles.dayMeta}>
                          Checked in · no check-out
                        </Text>
                      ) : (
                        <Text style={styles.dayMeta}>No attendance record</Text>
                      )}
                    </View>
                    <Button
                      label={issue.category === 'check_in_without_check_out' ? 'Complete' : 'Resolve'}
                      variant="ghost"
                      onPress={() => openResolve(issue)}
                    />
                  </View>
                ))}
              </View>
            );
          })}

          {issueSummary.noCheckInCount > 0 ? (
            <View style={styles.overrideCard}>
              <Text style={styles.overrideTitle}>Admin override (incomplete month)</Text>
              <Text style={styles.overrideDesc}>
                When unresolved days reflect a real situation — officer left mid-month, no shift for part
                of the period, etc. — apply a bulk override. This is tagged as payroll admin override,
                not genuine attendance data.
              </Text>
              <Button
                label={`Bulk resolve ${issueSummary.noCheckInCount} day(s)…`}
                variant="secondary"
                onPress={() => {
                  setBulkError(null);
                  setBulkSuccess(null);
                  setBulkReason('');
                  setBulkChoice('');
                  setBulkStep('choose');
                  setShowBulkModal(true);
                }}
              />
            </View>
          ) : null}

          <View style={styles.auditCard}>
            <Text style={styles.sectionTitle}>Triage audit trail</Text>
            {(auditLog ?? []).length ? (
              (auditLog ?? []).map((entry) => (
                <View key={entry.id} style={styles.auditRow}>
                  <Text style={styles.auditAction}>
                    {entry.action.replace(/_/g, ' ')}
                    {entry.resolutionType === 'payroll_bulk_override' ? ' · admin override' : ''}
                  </Text>
                  <Text style={styles.auditMeta}>
                    {formatIssueDate(entry.shiftDate)} ·{' '}
                    {new Date(entry.performedAt).toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.auditReason}>{entry.reason}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.auditEmpty}>No triage corrections yet this period.</Text>
            )}
          </View>

          <View style={styles.actions}>
            <Button label="Back" variant="ghost" onPress={() => navigation.goBack()} />
            <Button
              label="Done — return to confirm generation"
              variant="primary"
              onPress={handleDone}
            />
          </View>
        </DismissKeyboardScrollView>

        <Modal visible={Boolean(resolveModal)} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <DismissKeyboardScrollView contentContainerStyle={styles.modalSheet}>
              <Text style={styles.modalTitle}>
                {resolveModal?.mode === 'checkout' ? 'Complete check-out' : 'Resolve day'}
              </Text>
              {resolveModal ? (
                <Text style={styles.modalSubtitle}>{formatIssueDate(resolveModal.issue.date)}</Text>
              ) : null}
              {resolveError ? <Text style={styles.formError}>{resolveError}</Text> : null}

              {resolveModal?.mode === 'status' ? (
                <SelectField
                  label="Status"
                  value={resolveStatus}
                  options={STATUS_OPTIONS}
                  onSelect={setResolveStatus}
                />
              ) : (
                <FormField
                  label="Check-out time (HH:MM)"
                  value={checkOutTime}
                  onChangeText={setCheckOutTime}
                  placeholder="18:00"
                />
              )}

              <FormField
                label="Reason (required)"
                value={resolveReason}
                onChangeText={setResolveReason}
                multiline
              />

              <View style={styles.modalActions}>
                <Button label="Cancel" variant="ghost" onPress={() => setResolveModal(null)} />
                <Button
                  label="Save correction"
                  variant="primary"
                  onPress={() => void handleResolveSubmit()}
                  disabled={isResolving || isCompleting}
                />
              </View>
            </DismissKeyboardScrollView>
          </View>
        </Modal>

        <Modal visible={showBulkModal} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <DismissKeyboardScrollView contentContainerStyle={styles.modalSheet}>
              <Text style={styles.modalTitle}>Bulk admin override</Text>
              <Text style={styles.modalSubtitle}>
                {issueSummary.noCheckInCount} unresolved day(s) require an explicit status choice.
              </Text>
              {bulkError ? <Text style={styles.formError}>{bulkError}</Text> : null}

              {bulkStep === 'choose' ? (
                <>
                  <SelectField
                    label="Status for all selected days (required)"
                    value={bulkChoice}
                    options={BULK_STATUS_OPTIONS}
                    onSelect={(value) => setBulkChoice(value as BulkOverrideStatusChoice)}
                  />
                  {bulkChoice ? (
                    <Text style={styles.choiceHint}>
                      {BULK_OVERRIDE_STATUS_OPTIONS.find((option) => option.value === bulkChoice)?.description}
                    </Text>
                  ) : (
                    <Text style={styles.choiceHint}>Choose how these days should affect gross pay.</Text>
                  )}
                  <FormField
                    label="Override reason (required)"
                    value={bulkReason}
                    onChangeText={setBulkReason}
                    multiline
                  />
                  <View style={styles.modalActions}>
                    <Button label="Cancel" variant="ghost" onPress={() => setShowBulkModal(false)} />
                    <Button
                      label="Review impact"
                      variant="primary"
                      onPress={() => {
                        if (!bulkChoice) {
                          setBulkError('Select a status before continuing');
                          return;
                        }
                        if (!bulkReason.trim()) {
                          setBulkError('A reason is required for admin override');
                          return;
                        }
                        setBulkError(null);
                        setBulkStep('confirm');
                      }}
                      disabled={!bulkChoice || !bulkReason.trim()}
                    />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.confirmCard}>
                    <Text style={styles.confirmText}>
                      You are about to mark {issueSummary.noCheckInCount} day(s) as{' '}
                      {bulkPayEstimate?.statusLabel ?? bulkChoice} — this will affect gross pay by
                      approximately {formatCurrencyInrPrecise(bulkPayEstimate?.totalImpact ?? 0)}.
                    </Text>
                    {(bulkPayEstimate?.totalImpact ?? 0) > 0 ? (
                      <Text style={styles.confirmMeta}>
                        ≈ {formatCurrencyInrPrecise(bulkPayEstimate?.perDayAverage ?? 0)} per day using
                        contract salary rates for each date.
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.modalActions}>
                    <Button
                      label="Back"
                      variant="ghost"
                      onPress={() => {
                        setBulkStep('choose');
                        setBulkError(null);
                      }}
                    />
                    <Button
                      label={isBulkSaving ? 'Applying override…' : 'Confirm override'}
                      variant="primary"
                      onPress={() => void handleBulkSubmit()}
                      disabled={isBulkSaving}
                    />
                  </View>
                </>
              )}
            </DismissKeyboardScrollView>
          </View>
        </Modal>
      </Screen>
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
  countBanner: { fontSize: 12, fontWeight: '600', color: colors.errorRed, marginTop: spacing.xs },
  resolvedBanner: { fontSize: 12, fontWeight: '600', color: colors.statusResolved, marginTop: spacing.xs },
  categoryCard: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  card_error: { borderColor: colors.errorRed },
  card_warning: { borderColor: colors.warningAmber },
  card_info: { borderColor: adminColors.primary },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  categoryTitle: { fontWeight: '700', fontSize: 14, color: adminColors.primary, flex: 1 },
  countPill: {
    backgroundColor: adminColors.primaryTint,
    borderRadius: radius.full,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  countPillText: { fontWeight: '700', color: adminColors.primary, fontSize: 13 },
  categoryDesc: { fontSize: 12, color: colors.textSecondary },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  dayMain: { flex: 1, gap: spacing.xxs },
  dayDate: { fontWeight: '600', color: colors.textPrimary, fontSize: 13 },
  dayMeta: { fontSize: 11, color: colors.textSecondary },
  overrideCard: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.warningAmber,
    gap: spacing.sm,
  },
  overrideTitle: { fontWeight: '700', fontSize: 14, color: colors.warningAmber },
  overrideDesc: { fontSize: 12, color: colors.textSecondary },
  auditCard: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.sm,
  },
  sectionTitle: { fontWeight: '700', fontSize: 14, color: adminColors.primary },
  auditRow: { gap: spacing.xxs, paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.borderDefault },
  auditAction: { fontWeight: '600', fontSize: 12, color: colors.textPrimary, textTransform: 'capitalize' },
  auditMeta: { fontSize: 10, color: colors.textSecondary },
  auditReason: { fontSize: 11, color: colors.textSecondary },
  auditEmpty: { fontSize: 12, color: colors.textSecondary },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    maxHeight: '80%',
  },
  modalTitle: { fontWeight: '700', fontSize: 16, color: adminColors.primary },
  modalSubtitle: { fontSize: 12, color: colors.textSecondary },
  modalActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  formError: { fontSize: 12, color: colors.errorRed },
  choiceHint: { fontSize: 12, color: colors.textSecondary },
  confirmCard: {
    backgroundColor: colors.amberLight,
    borderWidth: 1,
    borderColor: colors.warningAmber,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  confirmText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  confirmMeta: { fontSize: 12, color: colors.textSecondary },
});
