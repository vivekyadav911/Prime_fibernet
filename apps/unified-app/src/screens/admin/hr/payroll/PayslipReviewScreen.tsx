import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminButton, AdminScreenLayout, FormField, RoleGuard } from '@/components/admin';
import { PayslipTimesheetCalendar } from '@/components/payroll/PayslipTimesheetCalendar';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { usePayslipCalculation } from '@/hooks/usePayslipCalculation';
import {
  useGetPayslipAuditLogQuery,
  useVoidPayslipMutation,
} from '@/services/api/payrollApi';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminPayrollStackParamList } from '@/types/navigation';
import { formatCurrencyInrPrecise } from '@/utils/formatCurrency';
import { payslipPdfViewerParams } from '@/utils/payslipNavigation';
import { queryErrorMessage } from '@/utils/queryError';
import { payslipNeedsReviewError } from '@/services/payslip/payslipValidation';

type Props = NativeStackScreenProps<AdminPayrollStackParamList, 'PayslipReview'>;

export function PayslipReviewScreen({ route, navigation }: Props) {
  const { officerId, officerName, periodStart, periodEnd, payslipId: initialPayslipId } = route.params;
  const [activePayslipId, setActivePayslipId] = useState(initialPayslipId ?? null);
  const [showApprove, setShowApprove] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [overrideNote, setOverrideNote] = useState('');
  const [itemLabel, setItemLabel] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [itemType, setItemType] = useState<'addition' | 'deduction'>('addition');

  const [voidReason, setVoidReason] = useState('');
  const [showVoid, setShowVoid] = useState(false);

  const {
    payslip,
    isLoading,
    isError,
    error,
    refetch,
    addItem,
    removeItem,
    approve,
    isApproving,
    generatePDF,
  } = usePayslipCalculation(activePayslipId);

  const { data: auditLog } = useGetPayslipAuditLogQuery(activePayslipId ?? '', {
    skip: !activePayslipId,
  });
  const [voidPayslip, { isLoading: isVoiding }] = useVoidPayslipMutation();

  useEffect(() => {
    if (!activePayslipId && officerId) {
      navigation.replace('PayslipPreGeneration', {
        officerId,
        officerName: officerName ?? payslip?.employeeName ?? 'Officer',
        periodStart,
        periodEnd,
      });
    }
  }, [activePayslipId, officerId, navigation, periodStart, periodEnd]);

  const handleAddItem = useCallback(async () => {
    const amount = Number(itemAmount);
    if (!itemLabel.trim() || !Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid item', 'Enter a label and positive amount.');
      return;
    }
    try {
      await addItem(itemType, itemLabel.trim(), amount);
      setItemLabel('');
      setItemAmount('');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not add item');
    }
  }, [addItem, itemAmount, itemLabel, itemType]);

  const handleApprove = useCallback(async () => {
    if (!signatureName.trim()) {
      Alert.alert('Required', 'Enter your name as authorized signatory.');
      return;
    }
    try {
      await approve(signatureName.trim(), overrideNote.trim() || undefined);
      setShowApprove(false);
      Alert.alert('Approved', 'Payslip approved. You can now generate the PDF.');
      void refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Approval failed';
      if (msg.includes('negative') || msg.includes('zero')) {
        Alert.alert('Approval blocked', msg);
      } else {
        Alert.alert('Error', msg);
      }
    }
  }, [approve, signatureName, overrideNote, refetch]);

  const handleGeneratePdf = useCallback(async () => {
    try {
      await generatePDF();
      const refreshed = await refetch();
      const updated = refreshed.data;
      Alert.alert('PDF ready', 'Payslip PDF has been generated and saved.', [
        { text: 'Later', style: 'cancel' },
        ...(updated?.generatedPdfUrl
          ? [
              {
                text: 'View PDF',
                onPress: () => {
                  const params = payslipPdfViewerParams(updated);
                  if (params) navigation.navigate('PayslipPdfViewer', params);
                },
              },
            ]
          : []),
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'PDF generation failed');
    }
  }, [generatePDF, refetch, navigation]);

  const handleVoid = useCallback(async () => {
    if (!activePayslipId || !voidReason.trim()) {
      Alert.alert('Required', 'Enter a reason for voiding this payslip.');
      return;
    }
    try {
      await voidPayslip({ payslipId: activePayslipId, reason: voidReason.trim() }).unwrap();
      setShowVoid(false);
      Alert.alert('Voided', 'Payslip voided. You can regenerate from Payroll.', [
        {
          text: 'Regenerate',
          onPress: () =>
            navigation.replace('PayslipPreGeneration', {
              officerId,
              officerName: payslip?.employeeName ?? 'Officer',
              periodStart,
              periodEnd,
            }),
        },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Void failed');
    }
  }, [activePayslipId, navigation, officerId, payslip, periodEnd, periodStart, voidPayslip, voidReason]);

  const openPdfViewer = useCallback(() => {
    if (!payslip) return;
    const params = payslipPdfViewerParams(payslip);
    if (!params) {
      Alert.alert('No PDF', 'Generate the payslip PDF first after approval.');
      return;
    }
    navigation.navigate('PayslipPdfViewer', params);
  }, [navigation, payslip]);

  const periodMonth = Number(periodStart.slice(5, 7));
  const periodYear = Number(periodStart.slice(0, 4));

  if (isLoading || !payslip) {
    return (
      <AdminScreenLayout>
        <SkeletonLoader rows={10} />
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

  const snapshotError = payslipNeedsReviewError(payslip);
  if (snapshotError) {
    return (
      <AdminScreenLayout>
        <ErrorState
          message={`Payslip data is inconsistent and cannot be displayed.\n\n${snapshotError}\n\nRegenerate this payslip from Payroll after fixing the underlying issues.`}
          onRetry={() =>
            navigation.replace('PayslipPreGeneration', {
              officerId,
              officerName: payslip.employeeName,
              periodStart,
              periodEnd,
              payslipId: activePayslipId ?? undefined,
            })
          }
        />
      </AdminScreenLayout>
    );
  }

  const canApprove =
    payslip.status === 'draft' ||
    payslip.status === 'pending_review' ||
    payslip.status === 'needs_review' ||
    payslip.status === 'flagged_zero_pay';
  const canGeneratePdf = payslip.status === 'approved' || payslip.status === 'paid';
  const canVoid = payslip.status === 'approved' || payslip.status === 'paid';

  return (
    <RoleGuard requiredPermission="payroll.edit">
      <AdminScreenLayout>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.summaryCard}>
            <Text style={styles.employeeName}>{payslip.employeeName}</Text>
            <Text style={styles.period}>{payslip.payPeriodLabel}</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{formatCurrencyInrPrecise(payslip.hourlyRate)}</Text>
                <Text style={styles.statLbl}>Hourly rate</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{payslip.totalActualHours}h</Text>
                <Text style={styles.statLbl}>Total hours</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{formatCurrencyInrPrecise(payslip.grossEarnings)}</Text>
                <Text style={styles.statLbl}>Gross</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{formatCurrencyInrPrecise(payslip.netPay)}</Text>
                <Text style={styles.statLbl}>Net pay</Text>
              </View>
            </View>
          </View>

          <PayslipTimesheetCalendar
            year={periodYear}
            month={periodMonth}
            breakdown={payslip.dailyBreakdown ?? []}
            accent="admin"
          />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Line items</Text>
            {(payslip.lineItems ?? []).map((item) => (
              <View key={item.id} style={styles.lineItem}>
                <Text style={styles.lineLabel}>
                  {item.itemType === 'addition' ? '+' : '−'} {item.label}
                </Text>
                <Text style={styles.lineAmount}>{formatCurrencyInrPrecise(item.amount)}</Text>
                {canApprove ? (
                  <AdminButton
                    label="Remove"
                    variant="ghost"
                    onPress={() => void removeItem(item.id)}
                  />
                ) : null}
              </View>
            ))}

            {canApprove ? (
              <View style={styles.addItem}>
                <View style={styles.typeRow}>
                  <AdminButton
                    label="Addition"
                    variant={itemType === 'addition' ? 'primary' : 'ghost'}
                    onPress={() => setItemType('addition')}
                  />
                  <AdminButton
                    label="Deduction"
                    variant={itemType === 'deduction' ? 'primary' : 'ghost'}
                    onPress={() => setItemType('deduction')}
                  />
                </View>
                <FormField label="Label" value={itemLabel} onChangeText={setItemLabel} />
                <FormField
                  label="Amount"
                  value={itemAmount}
                  onChangeText={setItemAmount}
                  keyboardType="decimal-pad"
                />
                <AdminButton label="Add line item" variant="secondary" onPress={() => void handleAddItem()} />
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Audit trail</Text>
            {(auditLog ?? []).length ? (
              (auditLog ?? []).map((entry) => (
                <View key={entry.id} style={styles.auditRow}>
                  <Text style={styles.auditAction}>{entry.action.replace(/_/g, ' ')}</Text>
                  <Text style={styles.auditMeta}>
                    {new Date(entry.performedAt).toLocaleString('en-IN')}
                    {entry.previousStatus ? ` · ${entry.previousStatus} → ${entry.newStatus}` : ''}
                  </Text>
                  {entry.reason ? <Text style={styles.auditReason}>{entry.reason}</Text> : null}
                </View>
              ))
            ) : (
              <Text style={styles.auditEmpty}>No audit entries yet.</Text>
            )}
          </View>

          <View style={styles.actions}>
            {canApprove ? (
              <AdminButton
                label="Authorize & Approve"
                variant="primary"
                onPress={() => setShowApprove(true)}
                disabled={isApproving}
              />
            ) : null}
            {canGeneratePdf ? (
              <AdminButton
                label={payslip.generatedPdfUrl ? 'Regenerate PDF' : 'Generate PDF'}
                variant="secondary"
                onPress={() => void handleGeneratePdf()}
              />
            ) : null}
            {payslip.generatedPdfUrl ? (
              <AdminButton label="View PDF" variant="secondary" onPress={openPdfViewer} />
            ) : null}
            {canVoid ? (
              <AdminButton
                label="Void & regenerate"
                variant="ghost"
                onPress={() => setShowVoid(true)}
                disabled={isVoiding}
              />
            ) : null}
          </View>
        </ScrollView>

        <Modal visible={showVoid} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Void payslip</Text>
              <Text style={styles.modalHint}>
                Voids this approved payslip so it can be regenerated. Reason is logged in the audit
                trail.
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={voidReason}
                onChangeText={setVoidReason}
                placeholder="Reason for voiding"
                placeholderTextColor={colors.textSecondary}
                multiline
              />
              <View style={styles.modalActions}>
                <AdminButton label="Cancel" variant="ghost" onPress={() => setShowVoid(false)} />
                <AdminButton label="Void" variant="primary" onPress={() => void handleVoid()} />
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showApprove} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Authorize payslip</Text>
              <Text style={styles.modalHint}>Enter your name as the authorized signatory.</Text>
              <TextInput
                style={styles.input}
                value={signatureName}
                onChangeText={setSignatureName}
                placeholder="Authorized signatory name"
                placeholderTextColor={colors.textSecondary}
              />
              {payslip.netPay <= 0 ? (
                <>
                  <Text style={styles.warning}>
                    {payslip.netPay < 0
                      ? 'Net pay is negative — override note required.'
                      : 'Net pay is zero — override note required to approve.'}
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={overrideNote}
                    onChangeText={setOverrideNote}
                    placeholder={
                      payslip.netPay < 0
                        ? 'Explain negative net pay'
                        : 'Explain why a zero-pay payslip should be approved'
                    }
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </>
              ) : null}
              <View style={styles.modalActions}>
                <AdminButton label="Cancel" variant="ghost" onPress={() => setShowApprove(false)} />
                <AdminButton label="Approve" variant="primary" onPress={() => void handleApprove()} />
              </View>
            </View>
          </View>
        </Modal>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  summaryCard: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  employeeName: { fontSize: 18, fontWeight: '700', color: adminColors.primary },
  period: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { flex: 1, minWidth: 70 },
  statVal: { fontWeight: '700', fontSize: 14, color: colors.textPrimary },
  statLbl: { fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase' },
  section: { gap: spacing.sm },
  sectionTitle: { fontWeight: '700', fontSize: 14, color: adminColors.primary },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  lineLabel: { flex: 1, fontSize: 13 },
  lineAmount: { fontWeight: '600', fontSize: 13 },
  addItem: { gap: spacing.sm, marginTop: spacing.sm },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalTitle: { fontWeight: '700', fontSize: 16 },
  modalHint: { fontSize: 13, color: colors.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
  },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  warning: { fontSize: 12, color: colors.errorRed },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  auditRow: {
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
    gap: 2,
  },
  auditAction: { fontWeight: '600', fontSize: 13, textTransform: 'capitalize' },
  auditMeta: { fontSize: 11, color: colors.textSecondary },
  auditReason: { fontSize: 12, color: colors.textPrimary },
  auditEmpty: { fontSize: 12, color: colors.textSecondary },
});
