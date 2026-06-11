import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import {
  DateField,
  DocumentUploadCard,
  FormField,
  FormStepper,
  RoleGuard,
  SalaryTotalDisplay,
  SectionLabel,
  SelectField,
} from '@/components/admin';
import { KeyboardDismissView } from '@/components/common';
import { officerStrings } from '@/constants/officerStrings';
import { useKeyboardBottomInset } from '@/hooks/useKeyboardBottomInset';
import {
  AdminCreateOfficerSchema,
  BLOOD_GROUP_OPTIONS,
  CONTRACT_TYPE_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  OFFICER_WIZARD_STEPS,
  STEP_SCHEMAS,
  computeSalaryTotal,
  parseSalary,
  type AdminCreateOfficerFormData,
} from '@/schemas/adminCreateOfficer';
import {
  useCreateAdminOfficerMutation,
  useGetOfficerRolesQuery,
} from '@/store/api/endpoints';
import type { AdminOfficersStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';
import {
  pickOfficerDocument,
  pickOfficerImage,
  uploadOfficerDocumentFile,
  type OfficerDocumentType,
} from '@/utils/uploadOfficerDocument';

type Props = NativeStackScreenProps<AdminOfficersStackParamList, 'AddOfficer'>;

function errMsg(error: { message?: string } | undefined): string | undefined {
  return error?.message;
}

const DOC_FIELDS: {
  key: OfficerDocumentType;
  formKey: 'photoIdFrontUrl' | 'photoIdBackUrl' | 'profilePhotoUrl' | 'resumeUrl';
  label: string;
  required: boolean;
}[] = [
  { key: 'photo_id_front', formKey: 'photoIdFrontUrl', label: 'Photo ID - Front Side*', required: true },
  { key: 'photo_id_back', formKey: 'photoIdBackUrl', label: 'Photo ID - Back Side*', required: true },
  { key: 'profile_photo', formKey: 'profilePhotoUrl', label: 'Profile Photo*', required: true },
  { key: 'resume', formKey: 'resumeUrl', label: 'Resume/CV', required: false },
];

function randomSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function AddOfficerScreen({ navigation }: Props) {
  const keyboardInset = useKeyboardBottomInset(spacing.lg);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [step, setStep] = useState(1);
  const [uploadSessionId] = useState(randomSessionId);
  const [uploadingDoc, setUploadingDoc] = useState<OfficerDocumentType | null>(null);
  const [docNames, setDocNames] = useState<Partial<Record<OfficerDocumentType, string>>>({});

  const [createOfficer, { isLoading: saving }] = useCreateAdminOfficerMutation();
  const { data: roles = [] } = useGetOfficerRolesQuery();

  const roleOptions = useMemo(
    () => roles.map((r) => ({ value: r.id, label: r.name })),
    [roles],
  );

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<AdminCreateOfficerFormData>({
    resolver: zodResolver(AdminCreateOfficerSchema),
    defaultValues: {
      fullName: '',
      dateOfBirth: '',
      gender: 'Male',
      bloodGroup: '',
      maritalStatus: 'Single',
      profilePhotoUrl: '',
      email: '',
      phone: '',
      alternatePhone: '',
      currentAddress: '',
      permanentAddress: '',
      copyToPermanent: false,
      city: '',
      state: '',
      pincode: '',
      bankName: '',
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      emergencyContact1: { name: '', relationship: '', phone: '', address: '' },
      emergencyContact2: { name: '', relationship: '', phone: '', address: '' },
      roleId: '',
      region: '',
      positionApplied: '',
      designation: '',
      department: '',
      reportingTo: '',
      workLocation: '',
      workingHoursPerDay: '',
      weeklyOffDays: '',
      leaveEntitlementPerYear: '',
      contractType: 'Permanent',
      contractStartDate: '',
      basicSalary: '',
      hra: '',
      transportAllowance: '',
      otherAllowances: '',
      healthInsurance: false,
      pfApplicable: false,
      esicApplicable: false,
      highestQualification: '',
      university: '',
      graduationYear: '',
      criminalRecord: false,
      healthIssues: false,
      backgroundDetails: '',
      passwordMode: 'auto',
      password: '',
      confirmPassword: '',
      credentialsEmail: '',
      allowAdminViewPassword: false,
      photoIdFrontUrl: '',
      photoIdBackUrl: '',
      resumeUrl: '',
    },
    mode: 'onBlur',
  });

  const salaryWatch = useWatch({
    control,
    name: ['basicSalary', 'hra', 'transportAllowance', 'otherAllowances'],
  });
  const salaryTotal = useMemo(
    () =>
      computeSalaryTotal({
        basicSalary: salaryWatch[0],
        hra: salaryWatch[1],
        transportAllowance: salaryWatch[2],
        otherAllowances: salaryWatch[3],
      }),
    [salaryWatch],
  );

  const passwordMode = useWatch({ control, name: 'passwordMode' });

  const validateStep = async (s: number): Promise<boolean> => {
    const schema = STEP_SCHEMAS[s - 1];
    if (!schema) return false;
    const parsed = schema.safeParse(getValues());
    if (!parsed.success) {
      Alert.alert('Validation', parsed.error.errors[0]?.message ?? 'Please fix the highlighted fields.');
      return false;
    }
    return true;
  };

  const onNext = async () => {
    if (!(await validateStep(step))) return;
    if (step < 4) setStep(step + 1);
  };

  const onBack = () => {
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  };

  const handleDocUpload = async (
    docType: OfficerDocumentType,
    formKey: 'photoIdFrontUrl' | 'photoIdBackUrl' | 'profilePhotoUrl' | 'resumeUrl',
  ) => {
    try {
      setUploadingDoc(docType);
      const isPhoto = docType.includes('photo') || docType === 'profile_photo';
      const picked = isPhoto ? await pickOfficerImage() : await pickOfficerDocument();
      if (!picked) return;
      const url = await uploadOfficerDocumentFile(uploadSessionId, docType, picked);
      setValue(formKey, url, { shouldValidate: true });
      setDocNames((prev) => ({ ...prev, [docType]: picked.name }));
    } catch (e) {
      Alert.alert('Upload failed', queryErrorMessage(e));
    } finally {
      setUploadingDoc(null);
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      const emergencyContacts = [
        data.emergencyContact1,
        data.emergencyContact2?.name ? data.emergencyContact2 : undefined,
      ].filter((c): c is NonNullable<typeof c> => c != null);

      const result = await createOfficer({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        alternatePhone: data.alternatePhone,
        region: data.region,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        bloodGroup: data.bloodGroup,
        maritalStatus: data.maritalStatus,
        currentAddress: data.currentAddress,
        permanentAddress: data.permanentAddress,
        emergencyContacts,
        roleId: data.roleId,
        joiningDate: data.contractStartDate,
        baseSalary: parseSalary(data.basicSalary),
        bankName: data.bankName,
        accountHolderName: data.accountHolderName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        profilePhotoUrl: data.profilePhotoUrl,
        photoIdFrontUrl: data.photoIdFrontUrl,
        photoIdBackUrl: data.photoIdBackUrl,
        resumeUrl: data.resumeUrl,
        password: data.passwordMode === 'manual' ? data.password : undefined,
        passwordMode: data.passwordMode,
        credentialsEmail: data.credentialsEmail || undefined,
        allowAdminViewPassword: data.allowAdminViewPassword,
        contractType: data.contractType,
        contractStartDate: data.contractStartDate,
        contractTerms: {
          position: data.positionApplied,
          designation: data.designation,
          department: data.department,
          reportingTo: data.reportingTo,
          workLocation: data.workLocation,
          workingHoursPerDay: parseSalary(data.workingHoursPerDay),
          weeklyOffDays: parseSalary(data.weeklyOffDays),
          leaveEntitlementPerYear: parseSalary(data.leaveEntitlementPerYear),
          salary: {
            basic: parseSalary(data.basicSalary),
            hra: parseSalary(data.hra),
            transportAllowance: parseSalary(data.transportAllowance),
            otherAllowances: parseSalary(data.otherAllowances),
          },
          benefits: {
            healthInsurance: data.healthInsurance,
            pfApplicable: data.pfApplicable,
            esicApplicable: data.esicApplicable,
          },
        },
        education: {
          highestQualification: data.highestQualification,
          university: data.university,
          graduationYear: data.graduationYear,
        },
        backgroundInfo: {
          criminalRecord: data.criminalRecord,
          healthIssues: data.healthIssues,
          details: data.backgroundDetails,
        },
        positionApplied: data.positionApplied,
        expectedSalary: parseSalary(data.basicSalary),
      }).unwrap();

      const credMsg = result.generatedPassword
        ? `\n\n${officerStrings.form.credentialsCreated}\nEmail: ${result.loginEmail ?? data.email}\nPassword: ${result.generatedPassword}`
        : '';

      Alert.alert(
        officerStrings.form.successTitle,
        `${officerStrings.form.successMessage(data.fullName)}${credMsg}`,
        [{ text: 'OK', onPress: () => navigation.replace('OfficerDetail', { officerId: result.officerId }) }],
      );
    } catch (e) {
      Alert.alert('Error', queryErrorMessage(e));
    }
  });

  return (
    <RoleGuard requiredPermission="officers.create">
      <Screen padded={false} style={styles.screen}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={keyboardInset}
        >
          <KeyboardDismissView style={styles.flex}>
            <View style={[styles.layout, isWide && styles.layoutWide]}>
              <FormStepper steps={OFFICER_WIZARD_STEPS} currentStep={step} />

              <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
                {step === 1 ? (
                  <>
                    <SectionLabel title="Personal Information" />
                    <Controller control={control} name="fullName" render={({ field }) => (
                      <FormField label="Full Name*" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errMsg(errors.fullName)} />
                    )} />
                    <Controller control={control} name="dateOfBirth" render={({ field }) => (
                      <DateField label="Date of Birth*" value={field.value} onChange={field.onChange} error={errMsg(errors.dateOfBirth)} />
                    )} />
                    <Controller control={control} name="gender" render={({ field }) => (
                      <SelectField label="Gender*" options={GENDER_OPTIONS} value={field.value} onSelect={field.onChange} error={errMsg(errors.gender)} />
                    )} />
                    <Controller control={control} name="bloodGroup" render={({ field }) => (
                      <SelectField label="Blood Group" options={[{ value: '', label: 'Select' }, ...BLOOD_GROUP_OPTIONS]} value={field.value ?? ''} onSelect={field.onChange} />
                    )} />
                    <Controller control={control} name="maritalStatus" render={({ field }) => (
                      <SelectField label="Marital Status" options={MARITAL_STATUS_OPTIONS} value={field.value ?? 'Single'} onSelect={field.onChange} />
                    )} />
                    <DocumentUploadCard
                      label="Profile Photo"
                      fileName={docNames.profile_photo}
                      uploading={uploadingDoc === 'profile_photo'}
                      onUpload={() => void handleDocUpload('profile_photo', 'profilePhotoUrl')}
                    />
                  </>
                ) : null}

                {step === 2 ? (
                  <>
                    <SectionLabel title="Contact" />
                    <Controller control={control} name="email" render={({ field }) => (
                      <FormField label="Email*" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} autoCapitalize="none" keyboardType="email-address" error={errMsg(errors.email)} />
                    )} />
                    <Controller control={control} name="phone" render={({ field }) => (
                      <FormField label="Phone*" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType="phone-pad" error={errMsg(errors.phone)} />
                    )} />
                    <Controller control={control} name="alternatePhone" render={({ field }) => (
                      <FormField label="Alternate Phone" value={field.value ?? ''} onChangeText={field.onChange} keyboardType="phone-pad" />
                    )} />
                    <Controller control={control} name="currentAddress" render={({ field }) => (
                      <FormField label="Current Address" value={field.value ?? ''} onChangeText={field.onChange} multiline />
                    )} />
                    <Controller control={control} name="copyToPermanent" render={({ field }) => (
                      <Pressable style={styles.checkRow} onPress={() => {
                        const next = !field.value;
                        field.onChange(next);
                        if (next) setValue('permanentAddress', getValues('currentAddress'));
                      }}>
                        <Text style={styles.checkBox}>{field.value ? '☑' : '☐'}</Text>
                        <Text style={styles.checkLabel}>{officerStrings.form.copyToPermanent}</Text>
                      </Pressable>
                    )} />
                    <Controller control={control} name="permanentAddress" render={({ field }) => (
                      <FormField label="Permanent Address" value={field.value ?? ''} onChangeText={field.onChange} multiline />
                    )} />
                    <Controller control={control} name="city" render={({ field }) => (
                      <FormField label="City*" value={field.value} onChangeText={field.onChange} error={errMsg(errors.city)} />
                    )} />
                    <Controller control={control} name="state" render={({ field }) => (
                      <FormField label="State*" value={field.value} onChangeText={field.onChange} error={errMsg(errors.state)} />
                    )} />
                    <Controller control={control} name="pincode" render={({ field }) => (
                      <FormField label="Pincode*" value={field.value} onChangeText={field.onChange} keyboardType="number-pad" error={errMsg(errors.pincode)} />
                    )} />
                    <SectionLabel title="Bank Details" />
                    <Controller control={control} name="bankName" render={({ field }) => (
                      <FormField label="Bank Name" value={field.value ?? ''} onChangeText={field.onChange} />
                    )} />
                    <Controller control={control} name="accountHolderName" render={({ field }) => (
                      <FormField label="Account Holder Name" value={field.value ?? ''} onChangeText={field.onChange} />
                    )} />
                    <Controller control={control} name="accountNumber" render={({ field }) => (
                      <FormField label="Account Number" value={field.value ?? ''} onChangeText={field.onChange} keyboardType="number-pad" />
                    )} />
                    <Controller control={control} name="ifscCode" render={({ field }) => (
                      <FormField label="IFSC Code" value={field.value ?? ''} onChangeText={field.onChange} autoCapitalize="characters" error={errMsg(errors.ifscCode)} />
                    )} />
                    <SectionLabel title="Emergency Contact 1" />
                    <Controller control={control} name="emergencyContact1.name" render={({ field }) => (
                      <FormField label="Name" value={field.value ?? ''} onChangeText={field.onChange} />
                    )} />
                    <Controller control={control} name="emergencyContact1.relationship" render={({ field }) => (
                      <FormField label="Relationship" value={field.value ?? ''} onChangeText={field.onChange} />
                    )} />
                    <Controller control={control} name="emergencyContact1.phone" render={({ field }) => (
                      <FormField label="Phone" value={field.value ?? ''} onChangeText={field.onChange} keyboardType="phone-pad" />
                    )} />
                    <Controller control={control} name="emergencyContact1.address" render={({ field }) => (
                      <FormField label="Address" value={field.value ?? ''} onChangeText={field.onChange} multiline />
                    )} />
                    <SectionLabel title="Emergency Contact 2 (optional)" />
                    <Controller control={control} name="emergencyContact2.name" render={({ field }) => (
                      <FormField label="Name" value={field.value ?? ''} onChangeText={field.onChange} />
                    )} />
                    <Controller control={control} name="emergencyContact2.phone" render={({ field }) => (
                      <FormField label="Phone" value={field.value ?? ''} onChangeText={field.onChange} keyboardType="phone-pad" />
                    )} />
                  </>
                ) : null}

                {step === 3 ? (
                  <>
                    <SectionLabel title="Role & Contract" />
                    <Controller control={control} name="roleId" render={({ field }) => (
                      <SelectField label="Assigned Role*" options={roleOptions} value={field.value} onSelect={field.onChange} error={errMsg(errors.roleId)} />
                    )} />
                    <Controller control={control} name="positionApplied" render={({ field }) => (
                      <FormField label="Position Applied" value={field.value ?? ''} onChangeText={field.onChange} />
                    )} />
                    <Controller control={control} name="designation" render={({ field }) => (
                      <FormField label="Designation" value={field.value ?? ''} onChangeText={field.onChange} />
                    )} />
                    <Controller control={control} name="department" render={({ field }) => (
                      <FormField label="Department" value={field.value ?? ''} onChangeText={field.onChange} />
                    )} />
                    <Controller control={control} name="contractType" render={({ field }) => (
                      <SelectField label="Contract Type" options={CONTRACT_TYPE_OPTIONS} value={field.value ?? 'Permanent'} onSelect={field.onChange} />
                    )} />
                    <Controller control={control} name="contractStartDate" render={({ field }) => (
                      <DateField label="Start Date" value={field.value ?? ''} onChange={field.onChange} />
                    )} />
                    <Controller control={control} name="basicSalary" render={({ field }) => (
                      <FormField label="Basic Salary*" value={field.value ?? ''} onChangeText={field.onChange} keyboardType="decimal-pad" error={errMsg(errors.basicSalary)} />
                    )} />
                    <Controller control={control} name="hra" render={({ field }) => (
                      <FormField label="HRA" value={field.value ?? ''} onChangeText={field.onChange} keyboardType="decimal-pad" />
                    )} />
                    <Controller control={control} name="transportAllowance" render={({ field }) => (
                      <FormField label="Transport Allowance" value={field.value ?? ''} onChangeText={field.onChange} keyboardType="decimal-pad" />
                    )} />
                    <Controller control={control} name="otherAllowances" render={({ field }) => (
                      <FormField label="Other Allowances" value={field.value ?? ''} onChangeText={field.onChange} keyboardType="decimal-pad" />
                    )} />
                    <SalaryTotalDisplay total={salaryTotal} />
                    <SectionLabel title={officerStrings.form.credentials.title} />
                    <Controller control={control} name="passwordMode" render={({ field }) => (
                      <View style={styles.modeRow}>
                        <Pressable style={[styles.modeBtn, field.value === 'auto' && styles.modeBtnActive]} onPress={() => field.onChange('auto')}>
                          <Text style={styles.modeText}>{officerStrings.form.credentials.modeAuto}</Text>
                        </Pressable>
                        <Pressable style={[styles.modeBtn, field.value === 'manual' && styles.modeBtnActive]} onPress={() => field.onChange('manual')}>
                          <Text style={styles.modeText}>{officerStrings.form.credentials.modeManual}</Text>
                        </Pressable>
                      </View>
                    )} />
                    {passwordMode === 'manual' ? (
                      <>
                        <Controller control={control} name="password" render={({ field }) => (
                          <FormField label={officerStrings.form.credentials.password} value={field.value ?? ''} onChangeText={field.onChange} secureTextEntry error={errMsg(errors.password)} />
                        )} />
                        <Controller control={control} name="confirmPassword" render={({ field }) => (
                          <FormField label={officerStrings.form.credentials.confirmPassword} value={field.value ?? ''} onChangeText={field.onChange} secureTextEntry error={errMsg(errors.confirmPassword)} />
                        )} />
                      </>
                    ) : null}
                    <Controller control={control} name="credentialsEmail" render={({ field }) => (
                      <FormField label={officerStrings.form.credentials.credentialsEmail} value={field.value ?? ''} onChangeText={field.onChange} autoCapitalize="none" keyboardType="email-address" />
                    )} />
                    <Controller control={control} name="allowAdminViewPassword" render={({ field }) => (
                      <Pressable style={styles.checkRow} onPress={() => field.onChange(!field.value)}>
                        <Text style={styles.checkBox}>{field.value ? '☑' : '☐'}</Text>
                        <Text style={styles.checkLabel}>{officerStrings.form.credentials.allowAdminView}</Text>
                      </Pressable>
                    )} />
                  </>
                ) : null}

                {step === 4 ? (
                  <>
                    <SectionLabel title="Required Documents" />
                    {DOC_FIELDS.map((doc) => (
                      <Controller
                        key={doc.key}
                        control={control}
                        name={doc.formKey}
                        render={() => (
                          <DocumentUploadCard
                            label={doc.label}
                            fileName={docNames[doc.key]}
                            uploading={uploadingDoc === doc.key}
                            error={errMsg(errors[doc.formKey])}
                            onUpload={() => void handleDocUpload(doc.key, doc.formKey)}
                          />
                        )}
                      />
                    ))}
                  </>
                ) : null}

                <View style={styles.navRow}>
                  <Button label={step === 1 ? officerStrings.form.cancel : officerStrings.form.back} variant="ghost" onPress={onBack} />
                  {step < 4 ? (
                    <Button label={officerStrings.form.next} onPress={() => void onNext()} />
                  ) : (
                    <Button label={saving ? 'Submitting…' : officerStrings.form.submit} onPress={() => void onSubmit()} />
                  )}
                </View>
              </ScrollView>
            </View>
          </KeyboardDismissView>
        </KeyboardAvoidingView>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: adminColors.canvasBg },
  flex: { flex: 1 },
  layout: { flex: 1, padding: spacing.md },
  layoutWide: { flexDirection: 'row', gap: spacing.lg },
  form: { paddingBottom: spacing.xxl },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg, gap: spacing.sm },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.sm },
  checkBox: { fontSize: 18, color: adminColors.primary },
  checkLabel: { fontSize: 14, color: colors.textPrimary, flex: 1 },
  modeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  modeBtn: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
  },
  modeBtnActive: { borderColor: adminColors.primary, backgroundColor: adminColors.primaryTint },
  modeText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
});
