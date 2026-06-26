import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { FormField, RoleGuard } from '@/components/admin';
import { PayslipTimesheetCalendar } from '@/components/payroll/PayslipTimesheetCalendar';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { usePayslipCalculation } from '@/hooks/usePayslipCalculation';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminPayrollStackParamList } from '@/types/navigation';
import { formatCurrencyInrPrecise } from '@/utils/formatCurrency';
import { payslipPdfViewerParams } from '@/utils/payslipNavigation';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminPayrollStackParamList, 'PayslipReview'>;

export function PayslipReviewScreen({ route, navigation }: Props) {
  const { officerId, periodStart, periodEnd, payslipId: initialPayslipId } = route.params;
  const [activePayslipId, setActivePayslipId] = useState(initialPayslipId ?? null);
  const [showApprove, setShowApprove] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [overrideNote, setOverrideNote] = useState('');
  const [itemLabel, setItemLabel] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [itemType, setItemType] = useState<'addition' | 'deduction'>('addition');

  const {
    payslip,
    isLoading,
    isError,
    error,
    refetch,
    runCalculation,
    isCalculating,
    addItem,
    removeItem,
    approve,
    isApproving,
    generatePDF,
  } = usePayslipCalculation(activePayslipId);

  useEffect(() => {
    if (!activePayslipId && officerId) {
      void runCalculation(officerId, periodStart, periodEnd)
        .then((r) => {
          if (r.blocked) {
            Alert.alert('Blocked', `Incomplete attendance on: ${r.blockingDates.join(', ')}`);
            navigation.goBack();
            return;
          }
          if (r.payslipId) setActivePayslipId(r.payslipId);
        })
        .catch((e) => {
          Alert.alert('Error', e instanceof Error ? e.message : 'Calculation failed');
        });
    }
  }, [activePayslipId, officerId, periodStart, periodEnd, runCalculation, navigation]);

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
      if (msg.includes('negative')) {
        Alert.alert('Negative net pay', 'Add an override note explaining the negative net pay.');
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

  if (isLoading || isCalculating || !payslip) {
    return (
      <Screen style={adminScreenStyles.canvas}>
        <SkeletonLoader rows={10} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen style={adminScreenStyles.canvas}>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  const canApprove = payslip.status === 'draft' || payslip.status === 'pending_review';
  const canGeneratePdf = payslip.status === 'approved' || payslip.status === 'paid';

  return (
    <RoleGuard requiredPermission="payroll.edit">
      <Screen padded={false} style={adminScreenStyles.canvas}>
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
                  <Button
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
                  <Button
                    label="Addition"
                    variant={itemType === 'addition' ? 'primary' : 'ghost'}
                    onPress={() => setItemType('addition')}
                  />
                  <Button
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
                <Button label="Add line item" variant="secondary" onPress={() => void handleAddItem()} />
              </View>
            ) : null}
          </View>

          <View style={styles.actions}>
            {canApprove ? (
              <Button
                label="Authorize & Approve"
                variant="primary"
                onPress={() => setShowApprove(true)}
                disabled={isApproving}
              />
            ) : null}
            {canGeneratePdf ? (
              <Button
                label={payslip.generatedPdfUrl ? 'Regenerate PDF' : 'Generate PDF'}
                variant="secondary"
                onPress={() => void handleGeneratePdf()}
              />
            ) : null}
            {payslip.generatedPdfUrl ? (
              <Button label="View PDF" variant="secondary" onPress={openPdfViewer} />
            ) : null}
          </View>
        </ScrollView>

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
              {payslip.netPay < 0 ? (
                <>
                  <Text style={styles.warning}>Net pay is negative — override note required.</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={overrideNote}
                    onChangeText={setOverrideNote}
                    placeholder="Explain negative net pay"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </>
              ) : null}
              <View style={styles.modalActions}>
                <Button label="Cancel" variant="ghost" onPress={() => setShowApprove(false)} />
                <Button label="Approve" variant="primary" onPress={() => void handleApprove()} />
              </View>
            </View>
          </View>
        </Modal>
      </Screen>
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
});
