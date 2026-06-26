import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { Button, Screen } from '@prime/ui';

import { CollapsibleFormSection } from '@/components/admin/employment/CollapsibleFormSection';
import { DateField, FilterChips, FormField, RoleGuard, SelectField } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { buildDefaultFormValues, EMPLOYMENT_TYPE_OPTIONS, WEEKLY_OFF_OPTIONS } from '@/constants/employmentContractDefaults';
import { useCompanyDefaults } from '@/hooks/useCompanyDefaults';
import { useEmploymentContract } from '@/hooks/useEmploymentContract';
import { useGetOfficerProfileQuery } from '@/store/api/endpoints';
import {
  employmentContractDraftSchema,
  employmentContractGenerateSchema,
  isJoiningDateBackdated,
} from '@/schemas/employmentContract';
import type { AdminOfficersStackParamList } from '@/types/navigation';
import type { ContractFormValues } from '@/types/contract';
import { contractToFormValues } from '@/types/contract';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { autoSplitCtc } from '@/utils/ctcAutoSplit';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminOfficersStackParamList, 'EmploymentContractForm'>;

export function EmploymentContractFormScreen({ route, navigation }: Props) {
  const { officerId, contractId } = route.params;
  const { data: profile, isLoading: profileLoading } = useGetOfficerProfileQuery(officerId);
  const { contract, isLoading: contractLoading, saveDraft, generateAndSaveContract, savingDraft, finalizing } =
    useEmploymentContract(officerId);
  const { defaults: companyDefaults, savedDefaults } = useCompanyDefaults();
  const [submitting, setSubmitting] = useState<'draft' | 'generate' | null>(null);

  const initialValues = useMemo((): ContractFormValues | null => {
    if (contract) return contractToFormValues(contract);
    if (!profile) return null;
    return buildDefaultFormValues(officerId, profile, {
      companyName: companyDefaults.companyName,
      companyAddress: companyDefaults.companyAddress,
      companyCin: companyDefaults.companyCin ?? '',
      companyPan: companyDefaults.companyPan ?? '',
      signatoryName: companyDefaults.defaultSignatoryName ?? '',
      signatoryDesignation: companyDefaults.defaultSignatoryDesignation ?? '',
      governingLaw: companyDefaults.defaultGoverningLaw ?? undefined,
    });
  }, [contract, profile, officerId, companyDefaults]);

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(employmentContractDraftSchema) as never,
    defaultValues: initialValues ?? undefined,
    mode: 'onChange',
  });

  const { control, handleSubmit, watch, setValue, reset } = form;
  const values = watch();

  useEffect(() => {
    if (initialValues) reset(initialValues);
  }, [initialValues, reset]);

  useEffect(() => {
    if (contractId && contract?.id === contractId) {
      reset(contractToFormValues(contract));
    }
  }, [contractId, contract, reset]);

  useEffect(() => {
    if (values.useSavedCompanyDetails && companyDefaults.companyName) {
      setValue('companyName', companyDefaults.companyName);
      setValue('companyAddress', companyDefaults.companyAddress);
      setValue('companyCin', companyDefaults.companyCin ?? '');
      setValue('companyPan', companyDefaults.companyPan ?? '');
      setValue('authorizedSignatoryName', companyDefaults.defaultSignatoryName ?? '');
      setValue('authorizedSignatoryDesignation', companyDefaults.defaultSignatoryDesignation ?? '');
      if (companyDefaults.defaultGoverningLaw) {
        setValue('governingLawJurisdiction', companyDefaults.defaultGoverningLaw);
      }
    }
  }, [values.useSavedCompanyDetails, companyDefaults, setValue]);

  const canGenerate = useMemo(() => {
    const parsed = employmentContractGenerateSchema.safeParse(values);
    return parsed.success;
  }, [values]);

  const backdateWarning = isJoiningDateBackdated(values.dateOfJoining);

  const handleAutoSplit = useCallback(() => {
    const ctc = Number(String(values.ctcAnnual).replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(ctc) || ctc <= 0) {
      Alert.alert('Invalid CTC', 'Enter a valid annual CTC first.');
      return;
    }
    const split = autoSplitCtc(ctc);
    setValue('basicSalaryMonthly', String(split.basicSalaryMonthly));
    setValue('hraMonthly', String(split.hraMonthly));
    setValue('specialAllowanceMonthly', String(split.specialAllowanceMonthly));
    setValue('pfEmployerContribution', String(split.pfEmployerContribution));
  }, [values.ctcAnnual, setValue]);

  const onSaveDraft = handleSubmit(async (data: ContractFormValues) => {
    try {
      setSubmitting('draft');
      await saveDraft({ ...data, contractId: contract?.id ?? contractId });
      Alert.alert('Saved', 'Contract saved as draft.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', queryErrorMessage(e));
    } finally {
      setSubmitting(null);
    }
  });

  const onSaveGenerate = handleSubmit(async (data: ContractFormValues) => {
    const strict = employmentContractGenerateSchema.safeParse(data);
    if (!strict.success) {
      Alert.alert('Validation', strict.error.errors[0]?.message ?? 'Please complete required fields.');
      return;
    }
    try {
      setSubmitting('generate');
      await generateAndSaveContract(
        { ...data, contractId: contract?.id ?? contractId },
        contract ?? null,
        savedDefaults ?? null,
      );
      Alert.alert('Success', 'Contract saved and PDF generated.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', queryErrorMessage(e));
    } finally {
      setSubmitting(null);
    }
  });

  if (profileLoading || contractLoading || !initialValues) {
    return (
      <Screen style={adminScreenStyles.canvas}>
        <SkeletonLoader rows={8} />
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen style={adminScreenStyles.canvas}>
        <ErrorState message="Officer profile not found." onRetry={() => navigation.goBack()} />
      </Screen>
    );
  }

  return (
    <RoleGuard requiredPermission="officers.edit">
      <Screen padded={false} style={adminScreenStyles.canvas}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.pageTitle}>Employment Contract</Text>
            <Text style={styles.subtitle}>{profile.fullName}</Text>

            <CollapsibleFormSection title="Company Details" icon="🏢" defaultExpanded>
              <Controller
                control={control}
                name="useSavedCompanyDetails"
                render={({ field: { value, onChange } }) => (
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Use saved company details</Text>
                    <Switch value={value} onValueChange={onChange} trackColor={{ true: adminColors.primary }} />
                  </View>
                )}
              />
              <Controller control={control} name="companyName" render={({ field, fieldState }) => (
                <FormField label="Company name" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
              )} />
              <Controller control={control} name="companyAddress" render={({ field, fieldState }) => (
                <FormField label="Company address" value={field.value} onChangeText={field.onChange} multiline error={fieldState.error?.message} />
              )} />
              <Controller control={control} name="companyCin" render={({ field }) => (
                <FormField label="CIN" value={field.value} onChangeText={field.onChange} autoCapitalize="characters" />
              )} />
              <Controller control={control} name="companyPan" render={({ field, fieldState }) => (
                <FormField label="Company PAN" value={field.value} onChangeText={field.onChange} autoCapitalize="characters" error={fieldState.error?.message} />
              )} />
              <Controller control={control} name="authorizedSignatoryName" render={({ field, fieldState }) => (
                <FormField label="Authorized signatory" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
              )} />
              <Controller control={control} name="authorizedSignatoryDesignation" render={({ field, fieldState }) => (
                <FormField label="Signatory designation" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
              )} />
            </CollapsibleFormSection>

            <CollapsibleFormSection title="Employee Details" icon="👤">
              <Controller control={control} name="employeeFullName" render={({ field, fieldState }) => (
                <FormField label="Full name" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
              )} />
              <Controller control={control} name="employeeAddress" render={({ field, fieldState }) => (
                <FormField label="Address" value={field.value} onChangeText={field.onChange} multiline error={fieldState.error?.message} />
              )} />
              <Controller control={control} name="employeePhone" render={({ field }) => (
                <FormField label="Phone" value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" />
              )} />
              <Controller control={control} name="employeeEmail" render={({ field, fieldState }) => (
                <FormField label="Email" value={field.value} onChangeText={field.onChange} keyboardType="email-address" error={fieldState.error?.message} />
              )} />
              <Controller control={control} name="employeePan" render={({ field, fieldState }) => (
                <FormField label="Employee PAN" value={field.value} onChangeText={field.onChange} autoCapitalize="characters" error={fieldState.error?.message} />
              )} />
              <Controller control={control} name="employeeAadhaarLast4" render={({ field, fieldState }) => (
                <FormField label="Aadhaar (last 4 digits)" value={field.value} onChangeText={(t) => field.onChange(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" maxLength={4} secureTextEntry helperText="Only last 4 digits are stored." error={fieldState.error?.message} />
              )} />
              <Controller control={control} name="employeeDesignation" render={({ field, fieldState }) => (
                <FormField label="Designation" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
              )} />
              <Controller control={control} name="employeeDepartment" render={({ field }) => (
                <FormField label="Department" value={field.value} onChangeText={field.onChange} />
              )} />
            </CollapsibleFormSection>

            <CollapsibleFormSection title="Employment Terms" icon="💼">
              <Controller control={control} name="employmentType" render={({ field }) => (
                <FilterChips
                  options={EMPLOYMENT_TYPE_OPTIONS}
                  selected={field.value}
                  onSelect={field.onChange}
                />
              )} />
              <Controller control={control} name="dateOfJoining" render={({ field, fieldState }) => (
                <>
                  <DateField label="Date of joining" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
                  {backdateWarning ? <Text style={styles.warning}>Date of joining is in the past — confirm this is intentional.</Text> : null}
                </>
              )} />
              {(values.employmentType === 'probation' || values.employmentType === 'full_time') ? (
                <Controller control={control} name="probationPeriodMonths" render={({ field }) => (
                  <FormField label="Probation period (months)" value={field.value} onChangeText={field.onChange} keyboardType="number-pad" />
                )} />
              ) : null}
              {values.employmentType === 'contract' ? (
                <Controller control={control} name="contractEndDate" render={({ field, fieldState }) => (
                  <DateField label="Contract end date" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
                )} />
              ) : null}
              <Controller control={control} name="reportingManager" render={({ field }) => (
                <FormField label="Reporting manager" value={field.value} onChangeText={field.onChange} />
              )} />
              <Controller control={control} name="workLocation" render={({ field, fieldState }) => (
                <FormField label="Work location" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
              )} />
            </CollapsibleFormSection>

            <CollapsibleFormSection title="Compensation (CTC)" icon="₹" defaultExpanded>
              <Controller control={control} name="ctcAnnual" render={({ field, fieldState }) => (
                <FormField label="Annual CTC (INR)" value={field.value} onChangeText={field.onChange} keyboardType="decimal-pad" error={fieldState.error?.message} />
              )} />
              <Button label="Auto-split CTC" variant="secondary" onPress={handleAutoSplit} />
              <Controller control={control} name="basicSalaryMonthly" render={({ field }) => (
                <FormField label="Basic (monthly)" value={field.value} onChangeText={field.onChange} keyboardType="decimal-pad" />
              )} />
              <Controller control={control} name="hraMonthly" render={({ field }) => (
                <FormField label="HRA (monthly)" value={field.value} onChangeText={field.onChange} keyboardType="decimal-pad" />
              )} />
              <Controller control={control} name="specialAllowanceMonthly" render={({ field }) => (
                <FormField label="Special allowance (monthly)" value={field.value} onChangeText={field.onChange} keyboardType="decimal-pad" />
              )} />
              <Controller control={control} name="pfEmployerContribution" render={({ field }) => (
                <FormField label="PF employer contribution (monthly)" value={field.value} onChangeText={field.onChange} keyboardType="decimal-pad" />
              )} />
              <Controller control={control} name="gratuityApplicable" render={({ field: { value, onChange } }) => (
                <ToggleRow label="Gratuity applicable" value={value} onChange={onChange} />
              )} />
              <Controller control={control} name="bonusTerms" render={({ field }) => (
                <FormField label="Bonus terms" value={field.value} onChangeText={field.onChange} multiline />
              )} />
              <Controller control={control} name="salaryPaymentDate" render={({ field }) => (
                <FormField label="Salary payment date" value={field.value} onChangeText={field.onChange} />
              )} />
              <Controller control={control} name="salaryRevisionClause" render={({ field }) => (
                <FormField label="Salary revision clause" value={field.value} onChangeText={field.onChange} multiline />
              )} />
            </CollapsibleFormSection>

            <CollapsibleFormSection title="Working Terms" icon="🕐">
              <Controller control={control} name="workingDaysPerWeek" render={({ field }) => (
                <FormField label="Working days per week" value={field.value} onChangeText={field.onChange} keyboardType="number-pad" />
              )} />
              <Controller control={control} name="workingHoursPerDay" render={({ field }) => (
                <FormField label="Working hours" value={field.value} onChangeText={field.onChange} />
              )} />
              <Controller control={control} name="weeklyOff" render={({ field }) => (
                <SelectField label="Weekly off" value={field.value} options={WEEKLY_OFF_OPTIONS.map((d) => ({ value: d, label: d }))} onSelect={field.onChange} />
              )} />
              <Controller control={control} name="leavePolicy" render={({ field }) => (
                <FormField label="Leave policy" value={field.value} onChangeText={field.onChange} multiline />
              )} />
            </CollapsibleFormSection>

            <CollapsibleFormSection title="Notice Period & Termination" icon="⚖️">
              <Controller control={control} name="noticePeriodDays" render={({ field, fieldState }) => (
                <FormField label="Notice period (days, post-probation)" value={field.value} onChangeText={field.onChange} keyboardType="number-pad" error={fieldState.error?.message} />
              )} />
              <Controller control={control} name="noticePeriodProbationDays" render={({ field, fieldState }) => (
                <FormField label="Notice period during probation (days)" value={field.value} onChangeText={field.onChange} keyboardType="number-pad" error={fieldState.error?.message} />
              )} />
              <Controller control={control} name="terminationClause" render={({ field }) => (
                <FormField label="Termination clause" value={field.value} onChangeText={field.onChange} multiline />
              )} />
              <Controller control={control} name="resignationClause" render={({ field }) => (
                <FormField label="Resignation clause" value={field.value} onChangeText={field.onChange} multiline />
              )} />
            </CollapsibleFormSection>

            <CollapsibleFormSection title="Confidentiality & Covenants" icon="🔒">
              <Controller control={control} name="confidentialityClause" render={({ field }) => (
                <FormField label="Confidentiality clause" value={field.value} onChangeText={field.onChange} multiline />
              )} />
              <Controller control={control} name="nonCompeteEnabled" render={({ field: { value, onChange } }) => (
                <ToggleRow label="Non-compete applicable" value={value} onChange={onChange} />
              )} />
              {values.nonCompeteEnabled ? (
                <>
                  <Controller control={control} name="nonCompeteMonths" render={({ field, fieldState }) => (
                    <FormField label="Non-compete duration (months)" value={field.value} onChangeText={field.onChange} keyboardType="number-pad" error={fieldState.error?.message} />
                  )} />
                  <Controller control={control} name="nonCompeteClause" render={({ field }) => (
                    <FormField label="Non-compete clause" value={field.value} onChangeText={field.onChange} multiline />
                  )} />
                </>
              ) : null}
              <Controller control={control} name="ipAssignmentClause" render={({ field }) => (
                <FormField label="IP assignment clause" value={field.value} onChangeText={field.onChange} multiline />
              )} />
            </CollapsibleFormSection>

            <CollapsibleFormSection title="Statutory Compliance" icon="📋">
              <Controller control={control} name="pfApplicable" render={({ field: { value, onChange } }) => (
                <ToggleRow label="Provident Fund (PF)" value={value} onChange={onChange} helper="Employee and employer contributions as per EPF Act." />
              )} />
              <Controller control={control} name="esiApplicable" render={({ field: { value, onChange } }) => (
                <ToggleRow label="Employee State Insurance (ESI)" value={value} onChange={onChange} helper="ESI applies if monthly gross is below ₹21,000 (verify current threshold)." />
              )} />
              <Controller control={control} name="professionalTaxApplicable" render={({ field: { value, onChange } }) => (
                <ToggleRow label="Professional Tax" value={value} onChange={onChange} helper="State-specific tax deducted from salary." />
              )} />
              <Controller control={control} name="tdsApplicable" render={({ field: { value, onChange } }) => (
                <ToggleRow label="Tax Deducted at Source (TDS)" value={value} onChange={onChange} helper="Income tax deducted per IT Act and Form 16." />
              )} />
            </CollapsibleFormSection>

            <CollapsibleFormSection title="Custom Clauses" icon="➕">
              <CustomClausesEditor
                clauses={values.customClauses}
                onChange={(clauses) => setValue('customClauses', clauses)}
              />
            </CollapsibleFormSection>

            <CollapsibleFormSection title="Governing Law" icon="🏛️">
              <Controller control={control} name="governingLawJurisdiction" render={({ field, fieldState }) => (
                <FormField label="Jurisdiction" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
              )} />
            </CollapsibleFormSection>

            <View style={styles.bottomPad} />
          </ScrollView>

          <View style={styles.footer}>
            <Button
              label={submitting === 'draft' || savingDraft ? 'Saving…' : 'Save as Draft'}
              variant="secondary"
              onPress={() => void onSaveDraft()}
              disabled={submitting === 'draft' || savingDraft}
            />
            <Button
              label={submitting === 'generate' || finalizing ? 'Generating…' : 'Save & Generate PDF'}
              onPress={() => void onSaveGenerate()}
              disabled={(!canGenerate && submitting !== 'generate') || submitting === 'generate' || finalizing}
            />
          </View>
        </KeyboardAvoidingView>
      </Screen>
    </RoleGuard>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  helper,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  helper?: string;
}) {
  return (
    <View style={styles.toggleBlock}>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{label}</Text>
        <Switch value={value} onValueChange={onChange} trackColor={{ true: adminColors.primary }} />
      </View>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

function CustomClausesEditor({
  clauses,
  onChange,
}: {
  clauses: ContractFormValues['customClauses'];
  onChange: (clauses: ContractFormValues['customClauses']) => void;
}) {
  const addClause = () => onChange([...clauses, { title: '', body: '' }]);
  const updateClause = (index: number, patch: Partial<{ title: string; body: string }>) => {
    onChange(clauses.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };
  const removeClause = (index: number) => onChange(clauses.filter((_, i) => i !== index));

  return (
    <View style={styles.clauseList}>
      {clauses.map((clause, index) => (
        <View key={index} style={styles.clauseCard}>
          <FormField label="Clause title" value={clause.title} onChangeText={(t) => updateClause(index, { title: t })} />
          <FormField label="Clause body" value={clause.body} onChangeText={(t) => updateClause(index, { body: t })} multiline />
          <Pressable onPress={() => removeClause(index)}>
            <Text style={styles.removeLink}>Remove clause</Text>
          </Pressable>
        </View>
      ))}
      <Button label="Add Custom Clause" variant="secondary" onPress={addClause} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  pageTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xxs },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.md },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: spacing.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, flex: 1, paddingRight: spacing.sm },
  toggleBlock: { gap: spacing.xxs },
  helper: { fontSize: 12, color: colors.textSecondary },
  warning: { fontSize: 12, color: adminColors.badgeWarning, marginTop: -spacing.xs },
  clauseList: { gap: spacing.sm },
  clauseCard: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 8,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  removeLink: { color: colors.errorRed, fontWeight: '600', fontSize: 13 },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderDefault,
    backgroundColor: adminColors.cardBg,
  },
  bottomPad: { height: spacing.lg },
});
