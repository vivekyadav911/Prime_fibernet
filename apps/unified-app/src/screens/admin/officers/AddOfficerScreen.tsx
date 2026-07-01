import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';


import { AdminScreenLayout, DateField,
  RoleGuard,
  SalaryTotalDisplay,
  SelectField, } from '@/components/admin';
import { DismissKeyboardScrollView } from '@/components/common';
import { officerStrings } from '@/constants/officerStrings';
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
import { useCreateAdminOfficerMutation } from '@/store/api/endpoints';
import type { AdminOfficersStackParamList } from '@/types/navigation';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { queryErrorMessage } from '@/utils/queryError';
import {
  pickOfficerDocument,
  pickOfficerImage,
  uploadOfficerDocumentFile,
  type OfficerDocumentType,
} from '@/utils/uploadOfficerDocument';

import { BTN_H, formStyles } from './addOfficerFormStyles';
import { AddOfficerFormField } from './components/AddOfficerFormField';
import { AddOfficerHorizontalStepper } from './components/AddOfficerHorizontalStepper';
import { AddOfficerSectionCard } from './components/AddOfficerSectionCard';
import { AddOfficerUploadCard } from './components/AddOfficerUploadCard';
import { ui } from './officersUi';

type Props = NativeStackScreenProps<AdminOfficersStackParamList, 'AddOfficer'>;

function errMsg(error: { message?: string } | undefined): string | undefined {
  return error?.message;
}

const DOC_FIELDS: {
  key: OfficerDocumentType;
  formKey: 'photoIdFrontStoragePath' | 'photoIdBackStoragePath' | 'profilePhotoStoragePath' | 'resumeStoragePath';
  label: string;
  required: boolean;
}[] = [
  { key: 'photo_id_front', formKey: 'photoIdFrontStoragePath', label: 'Photo ID - Front Side*', required: true },
  { key: 'photo_id_back', formKey: 'photoIdBackStoragePath', label: 'Photo ID - Back Side*', required: true },
  { key: 'profile_photo', formKey: 'profilePhotoStoragePath', label: 'Profile Photo*', required: true },
  { key: 'resume', formKey: 'resumeStoragePath', label: 'Resume/CV', required: false },
];

const pickerProps = {
  containerStyle: formStyles.fieldWrap,
  triggerStyle: formStyles.trigger,
  triggerTextStyle: formStyles.triggerText,
  accentColor: ui.brand,
  accentTint: 'rgba(91, 79, 233, 0.08)',
} as const;

function randomSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function AddOfficerScreen({ navigation }: Props) {
  const [step, setStep] = useState(1);
  const [uploadSessionId] = useState(randomSessionId);
  const [uploadingDoc, setUploadingDoc] = useState<OfficerDocumentType | null>(null);
  const [docNames, setDocNames] = useState<Partial<Record<OfficerDocumentType, string>>>({});

  const [createOfficer, { isLoading: saving }] = useCreateAdminOfficerMutation();

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
      profilePhotoStoragePath: '',
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
      photoIdFrontStoragePath: '',
      photoIdBackStoragePath: '',
      resumeStoragePath: '',
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
    formKey: 'photoIdFrontStoragePath' | 'photoIdBackStoragePath' | 'profilePhotoStoragePath' | 'resumeStoragePath',
  ) => {
    try {
      setUploadingDoc(docType);
      const isPhoto = docType.includes('photo') || docType === 'profile_photo';
      const picked = isPhoto ? await pickOfficerImage() : await pickOfficerDocument();
      if (!picked) return;
      const uploaded = await uploadOfficerDocumentFile(uploadSessionId, docType, picked);
      setValue(formKey, uploaded.storagePath, { shouldValidate: true });
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
        joiningDate: data.contractStartDate,
        baseSalary: parseSalary(data.basicSalary),
        bankName: data.bankName,
        accountHolderName: data.accountHolderName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        profilePhotoStoragePath: data.profilePhotoStoragePath,
        photoIdFrontStoragePath: data.photoIdFrontStoragePath,
        photoIdBackStoragePath: data.photoIdBackStoragePath,
        resumeStoragePath: data.resumeStoragePath,
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
      <AdminScreenLayout>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
            <DismissKeyboardScrollView
              style={styles.flex}
              contentContainerStyle={styles.scroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.introCard}>
                <Text style={styles.introTitle}>Add Officer</Text>
                <Text style={styles.introSubtitle}>
                  Create a new officer profile, role, and service details.
                </Text>
                <AddOfficerHorizontalStepper steps={OFFICER_WIZARD_STEPS} currentStep={step} />
              </View>

              {step === 1 ? (
                <AddOfficerSectionCard
                  title="Personal Information"
                  subtitle={OFFICER_WIZARD_STEPS[0].subtitle}
                >
                  <Controller
                    control={control}
                    name="fullName"
                    render={({ field }) => (
                      <AddOfficerFormField
                        label="Full Name*"
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        error={errMsg(errors.fullName)}
                        placeholder="Officer full name"
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <DateField
                        label="Date of Birth*"
                        value={field.value}
                        onChange={field.onChange}
                        error={errMsg(errors.dateOfBirth)}
                        placeholder="Select date"
                        {...pickerProps}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="gender"
                    render={({ field }) => (
                      <SelectField
                        label="Gender*"
                        options={GENDER_OPTIONS}
                        value={field.value}
                        onSelect={field.onChange}
                        error={errMsg(errors.gender)}
                        {...pickerProps}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="bloodGroup"
                    render={({ field }) => (
                      <SelectField
                        label="Blood Group"
                        options={[{ value: '', label: 'Select' }, ...BLOOD_GROUP_OPTIONS]}
                        value={field.value ?? ''}
                        onSelect={field.onChange}
                        {...pickerProps}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="maritalStatus"
                    render={({ field }) => (
                      <SelectField
                        label="Marital Status"
                        options={MARITAL_STATUS_OPTIONS}
                        value={field.value ?? 'Single'}
                        onSelect={field.onChange}
                        {...pickerProps}
                      />
                    )}
                  />
                  <AddOfficerUploadCard
                    label="Profile Photo"
                    fileName={docNames.profile_photo}
                    uploading={uploadingDoc === 'profile_photo'}
                    onUpload={() => void handleDocUpload('profile_photo', 'profilePhotoStoragePath')}
                  />
                </AddOfficerSectionCard>
              ) : null}

              {step === 2 ? (
                <>
                  <AddOfficerSectionCard title="Contact" subtitle="Email, phone, and address details.">
                    <Controller
                      control={control}
                      name="email"
                      render={({ field }) => (
                        <AddOfficerFormField
                          label="Email*"
                          value={field.value}
                          onChangeText={field.onChange}
                          onBlur={field.onBlur}
                          autoCapitalize="none"
                          keyboardType="email-address"
                          error={errMsg(errors.email)}
                          placeholder="officer@example.com"
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="phone"
                      render={({ field }) => (
                        <AddOfficerFormField
                          label="Phone*"
                          value={field.value}
                          onChangeText={field.onChange}
                          onBlur={field.onBlur}
                          keyboardType="phone-pad"
                          error={errMsg(errors.phone)}
                          placeholder="10-digit mobile"
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="alternatePhone"
                      render={({ field }) => (
                        <AddOfficerFormField
                          label="Alternate Phone"
                          value={field.value ?? ''}
                          onChangeText={field.onChange}
                          keyboardType="phone-pad"
                          placeholder="Optional"
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="currentAddress"
                      render={({ field }) => (
                        <AddOfficerFormField
                          label="Current Address"
                          value={field.value ?? ''}
                          onChangeText={field.onChange}
                          multiline
                          style={formStyles.textArea}
                          placeholder="Street, area, landmark"
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="copyToPermanent"
                      render={({ field }) => (
                        <Pressable
                          style={styles.checkRow}
                          onPress={() => {
                            const next = !field.value;
                            field.onChange(next);
                            if (next) setValue('permanentAddress', getValues('currentAddress'));
                          }}
                        >
                          <Ionicons
                            name={field.value ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={field.value ? ui.brand : ui.textSecondary}
                          />
                          <Text style={styles.checkLabel}>{officerStrings.form.copyToPermanent}</Text>
                        </Pressable>
                      )}
                    />
                    <Controller
                      control={control}
                      name="permanentAddress"
                      render={({ field }) => (
                        <AddOfficerFormField
                          label="Permanent Address"
                          value={field.value ?? ''}
                          onChangeText={field.onChange}
                          multiline
                          style={formStyles.textArea}
                          placeholder="Permanent address"
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="city"
                      render={({ field }) => (
                        <AddOfficerFormField
                          label="City*"
                          value={field.value}
                          onChangeText={field.onChange}
                          error={errMsg(errors.city)}
                          placeholder="City"
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="state"
                      render={({ field }) => (
                        <AddOfficerFormField
                          label="State*"
                          value={field.value}
                          onChangeText={field.onChange}
                          error={errMsg(errors.state)}
                          placeholder="State"
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="pincode"
                      render={({ field }) => (
                        <AddOfficerFormField
                          label="Pincode*"
                          value={field.value}
                          onChangeText={field.onChange}
                          keyboardType="number-pad"
                          error={errMsg(errors.pincode)}
                          placeholder="Pincode"
                        />
                      )}
                    />
                  </AddOfficerSectionCard>

                  <AddOfficerSectionCard title="Bank Details" subtitle="Payout account information.">
                    <Controller
                      control={control}
                      name="bankName"
                      render={({ field }) => (
                        <AddOfficerFormField
                          label="Bank Name"
                          value={field.value ?? ''}
                          onChangeText={field.onChange}
                          placeholder="Bank name"
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="accountHolderName"
                      render={({ field }) => (
                        <AddOfficerFormField
                          label="Account Holder Name"
                          value={field.value ?? ''}
                          onChangeText={field.onChange}
                          placeholder="As per bank records"
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="accountNumber"
                      render={({ field }) => (
                        <AddOfficerFormField
                          label="Account Number"
                          value={field.value ?? ''}
                          onChangeText={field.onChange}
                          keyboardType="number-pad"
                          placeholder="Account number"
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="ifscCode"
                      render={({ field }) => (
                        <AddOfficerFormField
                          label="IFSC Code"
                          value={field.value ?? ''}
                          onChangeText={field.onChange}
                          autoCapitalize="characters"
                          error={errMsg(errors.ifscCode)}
                          placeholder="e.g. SBIN0001234"
                        />
                      )}
                    />
                  </AddOfficerSectionCard>

                  <AddOfficerSectionCard title="Emergency Contact 1" subtitle="Primary emergency contact.">
                    <Controller
                      control={control}
                      name="emergencyContact1.name"
                      render={({ field }) => (
                        <AddOfficerFormField label="Name" value={field.value ?? ''} onChangeText={field.onChange} placeholder="Contact name" />
                      )}
                    />
                    <Controller
                      control={control}
                      name="emergencyContact1.relationship"
                      render={({ field }) => (
                        <AddOfficerFormField label="Relationship" value={field.value ?? ''} onChangeText={field.onChange} placeholder="e.g. Spouse" />
                      )}
                    />
                    <Controller
                      control={control}
                      name="emergencyContact1.phone"
                      render={({ field }) => (
                        <AddOfficerFormField label="Phone" value={field.value ?? ''} onChangeText={field.onChange} keyboardType="phone-pad" placeholder="Phone number" />
                      )}
                    />
                    <Controller
                      control={control}
                      name="emergencyContact1.address"
                      render={({ field }) => (
                        <AddOfficerFormField label="Address" value={field.value ?? ''} onChangeText={field.onChange} multiline style={formStyles.textArea} placeholder="Address" />
                      )}
                    />
                  </AddOfficerSectionCard>

                  <AddOfficerSectionCard title="Emergency Contact 2 (optional)" subtitle="Secondary emergency contact.">
                    <Controller
                      control={control}
                      name="emergencyContact2.name"
                      render={({ field }) => (
                        <AddOfficerFormField label="Name" value={field.value ?? ''} onChangeText={field.onChange} placeholder="Contact name" />
                      )}
                    />
                    <Controller
                      control={control}
                      name="emergencyContact2.phone"
                      render={({ field }) => (
                        <AddOfficerFormField label="Phone" value={field.value ?? ''} onChangeText={field.onChange} keyboardType="phone-pad" placeholder="Phone number" />
                      )}
                    />
                  </AddOfficerSectionCard>
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <AddOfficerSectionCard title="Role & Contract" subtitle={OFFICER_WIZARD_STEPS[2].subtitle}>
                    <Controller
                      control={control}
                      name="positionApplied"
                      render={({ field }) => (
                        <AddOfficerFormField label="Position Applied" value={field.value ?? ''} onChangeText={field.onChange} placeholder="Position title" />
                      )}
                    />
                    <Controller
                      control={control}
                      name="designation"
                      render={({ field }) => (
                        <AddOfficerFormField label="Designation" value={field.value ?? ''} onChangeText={field.onChange} placeholder="Designation" />
                      )}
                    />
                    <Controller
                      control={control}
                      name="department"
                      render={({ field }) => (
                        <AddOfficerFormField label="Department" value={field.value ?? ''} onChangeText={field.onChange} placeholder="Department" />
                      )}
                    />
                    <Controller
                      control={control}
                      name="contractType"
                      render={({ field }) => (
                        <SelectField
                          label="Contract Type"
                          options={CONTRACT_TYPE_OPTIONS}
                          value={field.value ?? 'Permanent'}
                          onSelect={field.onChange}
                          {...pickerProps}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="contractStartDate"
                      render={({ field }) => (
                        <DateField
                          label="Start Date"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          placeholder="Select date"
                          {...pickerProps}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="basicSalary"
                      render={({ field }) => (
                        <AddOfficerFormField
                          label="Basic Salary*"
                          value={field.value ?? ''}
                          onChangeText={field.onChange}
                          keyboardType="decimal-pad"
                          error={errMsg(errors.basicSalary)}
                          placeholder="0"
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="hra"
                      render={({ field }) => (
                        <AddOfficerFormField label="HRA" value={field.value ?? ''} onChangeText={field.onChange} keyboardType="decimal-pad" placeholder="0" />
                      )}
                    />
                    <Controller
                      control={control}
                      name="transportAllowance"
                      render={({ field }) => (
                        <AddOfficerFormField label="Transport Allowance" value={field.value ?? ''} onChangeText={field.onChange} keyboardType="decimal-pad" placeholder="0" />
                      )}
                    />
                    <Controller
                      control={control}
                      name="otherAllowances"
                      render={({ field }) => (
                        <AddOfficerFormField label="Other Allowances" value={field.value ?? ''} onChangeText={field.onChange} keyboardType="decimal-pad" placeholder="0" />
                      )}
                    />
                    <SalaryTotalDisplay total={salaryTotal} />
                  </AddOfficerSectionCard>

                  <AddOfficerSectionCard title={officerStrings.form.credentials.title} subtitle="Login credentials for the officer app.">
                    <Controller
                      control={control}
                      name="passwordMode"
                      render={({ field }) => (
                        <View style={styles.modeRow}>
                          <Pressable
                            style={[styles.modeBtn, field.value === 'auto' && styles.modeBtnActive]}
                            onPress={() => field.onChange('auto')}
                          >
                            <Text style={[styles.modeText, field.value === 'auto' && styles.modeTextActive]}>
                              {officerStrings.form.credentials.modeAuto}
                            </Text>
                          </Pressable>
                          <Pressable
                            style={[styles.modeBtn, field.value === 'manual' && styles.modeBtnActive]}
                            onPress={() => field.onChange('manual')}
                          >
                            <Text style={[styles.modeText, field.value === 'manual' && styles.modeTextActive]}>
                              {officerStrings.form.credentials.modeManual}
                            </Text>
                          </Pressable>
                        </View>
                      )}
                    />
                    {passwordMode === 'manual' ? (
                      <>
                        <Controller
                          control={control}
                          name="password"
                          render={({ field }) => (
                            <AddOfficerFormField
                              label={officerStrings.form.credentials.password}
                              value={field.value ?? ''}
                              onChangeText={field.onChange}
                              secureTextEntry
                              error={errMsg(errors.password)}
                              placeholder="Min. 8 characters"
                            />
                          )}
                        />
                        <Controller
                          control={control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <AddOfficerFormField
                              label={officerStrings.form.credentials.confirmPassword}
                              value={field.value ?? ''}
                              onChangeText={field.onChange}
                              secureTextEntry
                              error={errMsg(errors.confirmPassword)}
                              placeholder="Re-enter password"
                            />
                          )}
                        />
                      </>
                    ) : null}
                    <Controller
                      control={control}
                      name="credentialsEmail"
                      render={({ field }) => (
                        <AddOfficerFormField
                          label={officerStrings.form.credentials.credentialsEmail}
                          value={field.value ?? ''}
                          onChangeText={field.onChange}
                          autoCapitalize="none"
                          keyboardType="email-address"
                          placeholder="Login email (optional)"
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="allowAdminViewPassword"
                      render={({ field }) => (
                        <Pressable style={styles.checkRow} onPress={() => field.onChange(!field.value)}>
                          <Ionicons
                            name={field.value ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={field.value ? ui.brand : ui.textSecondary}
                          />
                          <Text style={styles.checkLabel}>{officerStrings.form.credentials.allowAdminView}</Text>
                        </Pressable>
                      )}
                    />
                  </AddOfficerSectionCard>
                </>
              ) : null}

              {step === 4 ? (
                <AddOfficerSectionCard title="Required Documents" subtitle={OFFICER_WIZARD_STEPS[3].subtitle}>
                  {DOC_FIELDS.map((doc) => (
                    <Controller
                      key={doc.key}
                      control={control}
                      name={doc.formKey}
                      render={() => (
                        <AddOfficerUploadCard
                          label={doc.label}
                          fileName={docNames[doc.key]}
                          uploading={uploadingDoc === doc.key}
                          error={errMsg(errors[doc.formKey])}
                          onUpload={() => void handleDocUpload(doc.key, doc.formKey)}
                        />
                      )}
                    />
                  ))}
                </AddOfficerSectionCard>
              ) : null}

              <View style={styles.footer}>
                <Pressable
                  onPress={onBack}
                  style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryBtnText}>
                    {step === 1 ? officerStrings.form.cancel : officerStrings.form.back}
                  </Text>
                </Pressable>
                {step < 4 ? (
                  <Pressable
                    onPress={() => void onNext()}
                    style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.primaryBtnText}>{officerStrings.form.next}</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => void onSubmit()}
                    disabled={saving}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      saving && styles.primaryBtnDisabled,
                      pressed && !saving && styles.btnPressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.primaryBtnText}>
                      {saving ? 'Submitting…' : officerStrings.form.submit}
                    </Text>
                  </Pressable>
                )}
              </View>
            </DismissKeyboardScrollView>
        </KeyboardAvoidingView>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: ui.pagePad,
    paddingTop: 12,
    paddingBottom: 24,
    gap: ui.sectionGap,
  },
  introCard: {
    backgroundColor: ui.card,
    borderRadius: ui.radiusHero,
    padding: ui.cardPad,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ui.border,
    ...ui.shadow,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: ui.text,
    letterSpacing: -0.3,
  },
  introSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: ui.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 4,
  },
  secondaryBtn: {
    minHeight: BTN_H,
    paddingHorizontal: 18,
    borderRadius: ui.btnRadius,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: ui.touch,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.textSecondary,
  },
  primaryBtn: {
    minHeight: BTN_H,
    paddingHorizontal: 22,
    borderRadius: ui.btnRadius,
    backgroundColor: ui.brand,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  btnPressed: { opacity: 0.92 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: ui.touch,
    marginBottom: 14,
  },
  checkLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: ui.text,
    flex: 1,
    lineHeight: 19,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  modeBtn: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: ui.radiusSm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ui.border,
    backgroundColor: ui.searchFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnActive: {
    borderColor: '#D8D2F8',
    backgroundColor: '#ECE9FD',
  },
  modeText: {
    fontSize: 13,
    fontWeight: '600',
    color: ui.textSecondary,
    textAlign: 'center',
  },
  modeTextActive: {
    color: ui.brand,
  },
});
