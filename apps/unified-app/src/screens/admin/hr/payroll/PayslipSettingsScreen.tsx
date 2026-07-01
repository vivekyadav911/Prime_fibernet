import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AdminButton, AdminScreenLayout, DateField, FormField, RoleGuard } from '@/components/admin';
import { OfficerSearchField } from '@/components/payroll/OfficerSearchField';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { usePayslipSettings } from '@/hooks/usePayslipSettings';
import { useGetOfficersQuery } from '@/services/api/officersApi';
import { useGetPayrollCompensationForOfficerQuery } from '@/services/api/payrollApi';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminPayrollStackParamList } from '@/types/navigation';
import { formatCurrencyInrPrecise } from '@/utils/formatCurrency';
import { formatCompensationRange } from '@/services/payslip/payslipValidation';
import { getLocalDateString } from '@/utils/dateUtils';

type Props = NativeStackScreenProps<AdminPayrollStackParamList, 'PayslipSettings'>;

const STEPS = [
  {
    id: 'salary',
    label: '1. Salary',
    hint: 'Read-only view of contract-sourced compensation. Edit via Officer Contract, not here.',
  },
  {
    id: 'rules',
    label: '2. Pay rules',
    hint: 'Each attendance status maps to a pay fraction and hours basis (scheduled vs actual).',
  },
  {
    id: 'labels',
    label: '3. Labels',
    hint: 'Clocked hours ÷ shift hours → attendance %. These bands become the display label on payslips.',
  },
  { id: 'holidays', label: '4. Holidays', hint: 'Company holidays are paid per the holiday pay rule.' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

export function PayslipSettingsScreen({ navigation }: Props) {
  const [step, setStep] = useState<StepId>('salary');
  const [holidayDate, setHolidayDate] = useState(getLocalDateString());
  const [holidayName, setHolidayName] = useState('');
  const [holidayScopeAll, setHolidayScopeAll] = useState(true);
  const [holidayScopeLabel, setHolidayScopeLabel] = useState('Company-wide');
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
  const [selectedOfficerId, setSelectedOfficerId] = useState('');

  const settingsYear = new Date().getFullYear();
  const {
    payTypeRules,
    labelThresholds,
    companyHolidays,
    compensations,
    isLoading,
    isError,
    refetch,
    createHoliday,
    updateHoliday,
    deleteHoliday,
  } = usePayslipSettings(settingsYear);

  const { data: officers } = useGetOfficersQuery();
  const officerNameById = useMemo(
    () => new Map((officers ?? []).map((o) => [o.id, o.name])),
    [officers],
  );
  const { data: contractComp, isLoading: isCompLoading } = useGetPayrollCompensationForOfficerQuery(
    { officerId: selectedOfficerId },
    { skip: !selectedOfficerId },
  );

  const orphanRecords = useMemo(
    () => compensations.filter((item) => item.isOrphan),
    [compensations],
  );

  const activeStep = STEPS.find((s) => s.id === step)!;
  const stepIndex = STEPS.findIndex((s) => s.id === step);

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
        <ErrorState message="Could not load payslip settings" onRetry={refetch} />
      </AdminScreenLayout>
    );
  }

  return (
    <RoleGuard requiredPermission="payroll.edit">
      <AdminScreenLayout>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stepBar}>
          {STEPS.map((s) => (
            <AdminButton
              key={s.id}
              label={s.label}
              variant={step === s.id ? 'primary' : 'ghost'}
              onPress={() => setStep(s.id)}
            />
          ))}
        </ScrollView>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.flowCard}>
            <Text style={styles.flowTitle}>{activeStep.label}</Text>
            <Text style={styles.flowHint}>{activeStep.hint}</Text>
            <Text style={styles.flowSequence}>
              Attendance hours determine a Label, which selects a Pay Rule, which produces day pay.
              Use the steps above to configure each layer.
            </Text>
            <View style={styles.progressRow}>
              {STEPS.map((s, i) => (
                <View
                  key={s.id}
                  style={[styles.progressDot, i <= stepIndex ? styles.progressDotActive : null]}
                />
              ))}
            </View>
          </View>

          {step === 'salary' ? (
            <>
              <Text style={styles.helper}>
                Salary terms are sourced from each officer&apos;s employment contract (including
                revisions). Payroll no longer accepts free-form salary entry here.
              </Text>
              <View style={styles.form}>
                <OfficerSearchField value={selectedOfficerId} onSelect={setSelectedOfficerId} />
                {selectedOfficerId ? (
                  <AdminButton
                    label="View / manage in Officer Contract"
                    variant="secondary"
                    onPress={() =>
                      navigation.getParent()?.navigate('Officers', {
                        screen: 'EmploymentContractForm',
                        params: { officerId: selectedOfficerId },
                      })
                    }
                  />
                ) : null}
              </View>

              {selectedOfficerId && isCompLoading ? <SkeletonLoader rows={3} /> : null}

              {selectedOfficerId && contractComp?.contractTerms.length ? (
                contractComp.contractTerms.map((term) => (
                  <View key={term.id} style={styles.card}>
                    <Text style={styles.cardTitle}>
                      {officerNameById.get(selectedOfficerId) ?? 'Officer'} · contract term
                    </Text>
                    <Text style={styles.cardMeta}>
                      {formatCurrencyInrPrecise(term.monthlySalary)}/mo —{' '}
                      {formatCompensationRange(term.effectiveFrom, term.effectiveTo)}
                    </Text>
                    {term.reason ? <Text style={styles.cardDesc}>{term.reason}</Text> : null}
                  </View>
                ))
              ) : null}

              {selectedOfficerId && !isCompLoading && !contractComp?.hasContractSource ? (
                <View style={[styles.card, styles.warningCard]}>
                  <Text style={styles.cardTitle}>No contract-sourced salary</Text>
                  <Text style={styles.cardDesc}>
                    {contractComp?.warnings.join(' ') ||
                      'Create or sign an employment contract with compensation terms before generating payslips.'}
                  </Text>
                </View>
              ) : null}

              {orphanRecords.length ? (
                <View style={[styles.card, styles.warningCard]}>
                  <Text style={styles.cardTitle}>Legacy payroll salary records need review</Text>
                  <Text style={styles.cardDesc}>
                    These records were created directly in Payroll Settings and are not linked to a
                    contract. Reconcile them via Officer Contract — they are not used for new
                    payslip calculations.
                  </Text>
                  {orphanRecords.map((item) => (
                    <Text key={item.id} style={styles.cardMeta}>
                      {officerNameById.get(item.officerId) ?? item.officerId.slice(0, 8)} ·{' '}
                      {formatCurrencyInrPrecise(item.monthlySalary)}/mo ·{' '}
                      {formatCompensationRange(item.effectiveFrom, item.effectiveTo)}
                    </Text>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

          {step === 'rules' ? (
            <>
              <Text style={styles.helper}>
                Pay rules apply after a day&apos;s label/status is resolved. Fraction × hourly rate
                × hours (scheduled or actual).
              </Text>
              {payTypeRules.map((rule) => (
                <View key={rule.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{rule.attendanceStatus.replace(/_/g, ' ')}</Text>
                  <Text style={styles.cardMeta}>
                    Pay fraction: {rule.payFraction} ·{' '}
                    {rule.usesScheduledHours ? 'Scheduled hours' : 'Actual hours'}
                  </Text>
                  {rule.description ? (
                    <Text style={styles.cardDesc}>{rule.description}</Text>
                  ) : null}
                </View>
              ))}
            </>
          ) : null}

          {step === 'labels' ? (
            <>
              <Text style={styles.helper}>
                Labels are assigned from attendance % = actual hours ÷ scheduled shift hours. The
                matching label then selects the pay rule above.
              </Text>
              {labelThresholds.map((th) => (
                <View key={th.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{th.label}</Text>
                  <Text style={styles.cardMeta}>
                    {(th.minHoursFraction * 100).toFixed(0)}%
                    {th.maxHoursFraction != null
                      ? ` – ${(th.maxHoursFraction * 100).toFixed(0)}%`
                      : '+'}{' '}
                    of shift hours
                  </Text>
                </View>
              ))}
            </>
          ) : null}

          {step === 'holidays' ? (
            <>
              <View style={styles.form}>
                <DateField label="Holiday date" value={holidayDate} onChange={setHolidayDate} />
                <FormField label="Holiday name" value={holidayName} onChangeText={setHolidayName} />
                <View style={styles.typeRow}>
                  <AdminButton
                    label="Company-wide"
                    variant={holidayScopeAll ? 'primary' : 'ghost'}
                    onPress={() => {
                      setHolidayScopeAll(true);
                      setHolidayScopeLabel('Company-wide');
                    }}
                  />
                  <AdminButton
                    label="Specific group"
                    variant={!holidayScopeAll ? 'primary' : 'ghost'}
                    onPress={() => {
                      setHolidayScopeAll(false);
                      if (holidayScopeLabel === 'Company-wide') {
                        setHolidayScopeLabel('');
                      }
                    }}
                  />
                </View>
                {!holidayScopeAll ? (
                  <FormField
                    label="Scope (branch or officer group)"
                    value={holidayScopeLabel}
                    onChangeText={setHolidayScopeLabel}
                    placeholder="e.g. Delhi branch"
                  />
                ) : null}
                <AdminButton
                  label={editingHolidayId ? 'Save holiday' : 'Add holiday'}
                  variant="secondary"
                  onPress={() => {
                    if (!holidayDate || !holidayName.trim()) {
                      Alert.alert('Required', 'Enter date and name.');
                      return;
                    }
                    if (!holidayScopeAll && !holidayScopeLabel.trim()) {
                      Alert.alert('Required', 'Enter who this holiday applies to.');
                      return;
                    }
                    const payload = {
                      holidayDate,
                      name: holidayName.trim(),
                      appliesToAll: holidayScopeAll,
                      scopeLabel: holidayScopeAll ? 'Company-wide' : holidayScopeLabel.trim(),
                    };
                    const action = editingHolidayId
                      ? updateHoliday({ id: editingHolidayId, ...payload, appliesToAll: holidayScopeAll })
                      : createHoliday(payload);
                    void action
                      .unwrap()
                      .then(() => {
                        setHolidayName('');
                        setEditingHolidayId(null);
                        setHolidayScopeAll(true);
                        setHolidayScopeLabel('Company-wide');
                      })
                      .catch((e) =>
                        Alert.alert('Error', e instanceof Error ? e.message : 'Failed'),
                      );
                  }}
                />
                {editingHolidayId ? (
                  <AdminButton
                    label="Cancel edit"
                    variant="ghost"
                    onPress={() => {
                      setEditingHolidayId(null);
                      setHolidayName('');
                      setHolidayScopeAll(true);
                      setHolidayScopeLabel('Company-wide');
                    }}
                  />
                ) : null}
              </View>
              {companyHolidays.length ? null : (
                <Text style={styles.helper}>No holidays configured for {settingsYear} yet.</Text>
              )}
              {[...companyHolidays]
                .sort((a, b) => a.holidayDate.localeCompare(b.holidayDate))
                .map((h) => (
                  <View key={h.id} style={styles.card}>
                    <Text style={styles.cardTitle}>{h.name}</Text>
                    <Text style={styles.cardMeta}>
                      {h.holidayDate} · {h.scopeLabel}
                    </Text>
                    <View style={styles.typeRow}>
                      <AdminButton
                        label="Edit"
                        variant="ghost"
                        onPress={() => {
                          setEditingHolidayId(h.id);
                          setHolidayDate(h.holidayDate);
                          setHolidayName(h.name);
                          setHolidayScopeAll(h.appliesToAll);
                          setHolidayScopeLabel(h.scopeLabel);
                        }}
                      />
                      <AdminButton
                        label="Delete"
                        variant="ghost"
                        onPress={() =>
                          void deleteHoliday(h.id)
                            .unwrap()
                            .catch((e) =>
                              Alert.alert('Error', e instanceof Error ? e.message : 'Failed'),
                            )
                        }
                      />
                    </View>
                  </View>
                ))}
            </>
          ) : null}

          <View style={styles.navRow}>
            {stepIndex > 0 ? (
              <AdminButton
                label="Previous"
                variant="ghost"
                onPress={() => setStep(STEPS[stepIndex - 1]!.id)}
              />
            ) : null}
            {stepIndex < STEPS.length - 1 ? (
              <AdminButton
                label="Next step"
                variant="secondary"
                onPress={() => setStep(STEPS[stepIndex + 1]!.id)}
              />
            ) : null}
          </View>
        </ScrollView>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  stepBar: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, maxHeight: 52 },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  flowCard: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xs,
  },
  flowTitle: { fontWeight: '700', fontSize: 16, color: adminColors.primary },
  flowHint: { fontSize: 13, color: colors.textSecondary },
  flowSequence: { fontSize: 12, color: colors.textPrimary, marginTop: spacing.xxs },
  progressRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderDefault,
  },
  progressDotActive: { backgroundColor: adminColors.primary },
  helper: { fontSize: 12, color: colors.textSecondary },
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xxs,
  },
  warningCard: { borderColor: colors.warningAmber, backgroundColor: colors.amberLight },
  cardTitle: { fontWeight: '600', fontSize: 14, textTransform: 'capitalize' },
  cardMeta: { fontSize: 12, color: colors.textSecondary },
  cardDesc: { fontSize: 12, color: colors.textPrimary },
  form: { gap: spacing.sm, marginBottom: spacing.md },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
});
