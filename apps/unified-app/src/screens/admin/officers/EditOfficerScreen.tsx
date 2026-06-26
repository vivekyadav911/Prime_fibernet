import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { DateField, FormField, RoleGuard, SectionLabel, SelectField } from '@/components/admin';
import { DismissKeyboardScrollView, ErrorState, KeyboardDismissView } from '@/components/common';
import { officerStrings } from '@/constants/officerStrings';
import { useKeyboardBottomInset } from '@/hooks/useKeyboardBottomInset';
import { GENDER_OPTIONS, MARITAL_STATUS_OPTIONS } from '@/schemas/adminCreateOfficer';
import {
  useGetOfficerProfileQuery,
  useGetOfficerRolesQuery,
  useUpdateOfficerContactMutation,
  useUpdateOfficerPersonalMutation,
  useUpdateOfficerRoleMutation,
} from '@/store/api/endpoints';
import type { AdminOfficersStackParamList } from '@/types/navigation';
import type { EmergencyContact } from '@/types/api/officer';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminOfficersStackParamList, 'OfficerEdit'>;

type EditSection = 'personal' | 'contact' | 'role';

const BOOL_OPTIONS = [
  { value: 'yes' as const, label: officerStrings.detail.yes },
  { value: 'no' as const, label: officerStrings.detail.no },
];

const SECTION_LABELS: Record<EditSection, string> = {
  personal: officerStrings.detail.sections.personalInfo,
  contact: officerStrings.detail.sections.contactInfo,
  role: officerStrings.detail.sections.roleAssignment,
};

function parseExpectedSalary(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function EditOfficerScreen({ route, navigation }: Props) {
  const { officerId, section = 'personal' } = route.params;
  const keyboardInset = useKeyboardBottomInset(spacing.lg);
  const initialSection: EditSection =
    section === 'personal' || section === 'contact' || section === 'role' ? section : 'personal';
  const [activeSection, setActiveSection] = useState<EditSection>(initialSection);
  const [dirty, setDirty] = useState(false);

  const { data: profile, isLoading, isError, error, refetch } = useGetOfficerProfileQuery(officerId);
  const { data: roles = [] } = useGetOfficerRolesQuery();

  const [updatePersonal, { isLoading: savingPersonal }] = useUpdateOfficerPersonalMutation();
  const [updateContact, { isLoading: savingContact }] = useUpdateOfficerContactMutation();
  const [updateRole, { isLoading: savingRole }] = useUpdateOfficerRoleMutation();

  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('Single');
  const [highestQualification, setHighestQualification] = useState('');
  const [university, setUniversity] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [criminalRecord, setCriminalRecord] = useState<'yes' | 'no'>('no');
  const [healthIssues, setHealthIssues] = useState<'yes' | 'no'>('no');
  const [backgroundDetails, setBackgroundDetails] = useState('');
  const [positionApplied, setPositionApplied] = useState('');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [joiningDatePreference, setJoiningDatePreference] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [pincode, setPincode] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [emergencyContact1, setEmergencyContact1] = useState<EmergencyContact>({
    name: '',
    relationship: '',
    phone: '',
    address: '',
  });
  const [emergencyContact2, setEmergencyContact2] = useState<EmergencyContact>({
    name: '',
    relationship: '',
    phone: '',
    address: '',
  });
  const [roleId, setRoleId] = useState('');
  const [joiningDate, setJoiningDate] = useState('');

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName);
    setDateOfBirth(profile.dateOfBirth ?? '');
    setGender(profile.gender ?? 'Male');
    setBloodGroup(profile.bloodGroup ?? '');
    setMaritalStatus(profile.maritalStatus ?? 'Single');
    setHighestQualification(profile.education.highestQualification ?? '');
    setUniversity(profile.education.university ?? '');
    setGraduationYear(profile.education.graduationYear ?? '');
    setCriminalRecord(profile.backgroundInfo.criminalRecord ? 'yes' : 'no');
    setHealthIssues(profile.backgroundInfo.healthIssues ? 'yes' : 'no');
    setBackgroundDetails(profile.backgroundInfo.details ?? '');
    setPositionApplied(profile.positionApplied ?? '');
    setExpectedSalary(
      profile.expectedSalary != null ? String(profile.expectedSalary) : '',
    );
    setJoiningDatePreference(profile.joiningDatePreference ?? '');
    setEmail(profile.email);
    setPhone(profile.phone);
    setAlternatePhone(profile.alternatePhone ?? '');
    setCity(profile.city ?? '');
    setStateVal(profile.state ?? '');
    setPincode(profile.pincode ?? '');
    setCurrentAddress(profile.currentAddress ?? '');
    setPermanentAddress(profile.permanentAddress ?? '');
    setBankName(profile.bankDetails.bankName ?? '');
    setAccountHolderName(profile.bankDetails.accountHolderName ?? '');
    setAccountNumber(profile.bankDetails.accountNumber ?? '');
    setIfscCode(profile.bankDetails.ifscCode ?? '');
    setEmergencyContact1(profile.emergencyContacts[0] ?? {
      name: '',
      relationship: '',
      phone: '',
      address: '',
    });
    setEmergencyContact2(profile.emergencyContacts[1] ?? {
      name: '',
      relationship: '',
      phone: '',
      address: '',
    });
    setRoleId(profile.roleId ?? '');
    setJoiningDate(profile.joiningDate ?? '');
  }, [profile]);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (!dirty) return;
      e.preventDefault();
      Alert.alert(officerStrings.form.unsavedTitle, officerStrings.form.unsavedMessage, [
        { text: officerStrings.form.stay, style: 'cancel' },
        { text: officerStrings.form.discard, style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsub;
  }, [navigation, dirty]);

  const markDirty = useCallback(() => setDirty(true), []);

  const savePersonal = async () => {
    try {
      await updatePersonal({
        id: officerId,
        fullName,
        dateOfBirth,
        gender,
        bloodGroup,
        maritalStatus,
        education: {
          highestQualification: highestQualification || null,
          university: university || null,
          graduationYear: graduationYear || null,
        },
        backgroundInfo: {
          criminalRecord: criminalRecord === 'yes',
          healthIssues: healthIssues === 'yes',
          details: backgroundDetails || null,
        },
        positionApplied: positionApplied || undefined,
        expectedSalary: parseExpectedSalary(expectedSalary) ?? undefined,
        joiningDatePreference: joiningDatePreference || undefined,
      }).unwrap();
      setDirty(false);
      Alert.alert('Saved', 'Onboarding details updated.');
    } catch (e) {
      Alert.alert('Error', queryErrorMessage(e));
    }
  };

  const saveContact = async () => {
    try {
      await updateContact({
        id: officerId,
        email,
        phone,
        alternatePhone,
        city,
        state: stateVal,
        pincode,
        currentAddress,
        permanentAddress,
        bankDetails: {
          bankName: bankName || null,
          accountHolderName: accountHolderName || null,
          accountNumber: accountNumber || null,
          ifscCode: ifscCode || null,
        },
        emergencyContacts: [emergencyContact1, emergencyContact2],
      }).unwrap();
      setDirty(false);
      Alert.alert('Saved', 'Contact and bank details updated.');
    } catch (e) {
      Alert.alert('Error', queryErrorMessage(e));
    }
  };

  const saveRole = async () => {
    try {
      await updateRole({ id: officerId, roleId, joiningDate }).unwrap();
      setDirty(false);
      Alert.alert('Saved', 'Role assignment updated.');
    } catch (e) {
      Alert.alert('Error', queryErrorMessage(e));
    }
  };

  if (isLoading) {
    return <Screen style={adminScreenStyles.canvas}><Text>Loading…</Text></Screen>;
  }

  if (isError || !profile) {
    return (
      <Screen style={adminScreenStyles.canvas}>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  const roleOptions = roles.map((r) => ({ value: r.id, label: r.name }));

  const renderEmergencyContact = (
    index: 1 | 2,
    contact: EmergencyContact,
    setContact: (next: EmergencyContact) => void,
  ) => (
    <View key={index} style={styles.ecBlock}>
      <SectionLabel title={officerStrings.detail.labels.emergencyContact(index)} />
      <FormField
        label="Name"
        value={contact.name}
        onChangeText={(v) => { setContact({ ...contact, name: v }); markDirty(); }}
      />
      <FormField
        label={officerStrings.detail.labels.relationship}
        value={contact.relationship}
        onChangeText={(v) => { setContact({ ...contact, relationship: v }); markDirty(); }}
      />
      <FormField
        label="Phone"
        value={contact.phone}
        onChangeText={(v) => { setContact({ ...contact, phone: v }); markDirty(); }}
        keyboardType="phone-pad"
      />
      <FormField
        label={officerStrings.detail.labels.address}
        value={contact.address}
        onChangeText={(v) => { setContact({ ...contact, address: v }); markDirty(); }}
        multiline
      />
    </View>
  );

  return (
    <RoleGuard requiredPermission="officers.edit">
      <Screen style={adminScreenStyles.canvas}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={keyboardInset}>
          <KeyboardDismissView>
            <DismissKeyboardScrollView contentContainerStyle={styles.scroll}>
              <View style={styles.tabs}>
                {(['personal', 'contact', 'role'] as EditSection[]).map((s) => (
                  <Button
                    key={s}
                    label={SECTION_LABELS[s]}
                    variant={activeSection === s ? 'primary' : 'ghost'}
                    onPress={() => setActiveSection(s)}
                    style={styles.tabBtn}
                  />
                ))}
              </View>

              {activeSection === 'personal' ? (
                <>
                  <SectionLabel title={officerStrings.detail.sections.personalInfo} />
                  <FormField
                    label={officerStrings.detail.labels.fullName}
                    value={fullName}
                    onChangeText={(v) => { setFullName(v); markDirty(); }}
                  />
                  <DateField
                    label={officerStrings.detail.labels.dateOfBirth}
                    value={dateOfBirth}
                    onChange={(v) => { setDateOfBirth(v); markDirty(); }}
                  />
                  <SelectField
                    label={officerStrings.detail.labels.gender}
                    options={GENDER_OPTIONS}
                    value={gender}
                    onSelect={(v) => { setGender(v); markDirty(); }}
                  />
                  <FormField
                    label={officerStrings.detail.labels.bloodGroup}
                    value={bloodGroup}
                    onChangeText={(v) => { setBloodGroup(v); markDirty(); }}
                  />
                  <SelectField
                    label={officerStrings.detail.labels.maritalStatus}
                    options={MARITAL_STATUS_OPTIONS}
                    value={maritalStatus}
                    onSelect={(v) => { setMaritalStatus(v); markDirty(); }}
                  />

                  <SectionLabel title={officerStrings.detail.sections.education} />
                  <FormField
                    label={officerStrings.detail.labels.highestQualification}
                    value={highestQualification}
                    onChangeText={(v) => { setHighestQualification(v); markDirty(); }}
                  />
                  <FormField
                    label={officerStrings.detail.labels.university}
                    value={university}
                    onChangeText={(v) => { setUniversity(v); markDirty(); }}
                  />
                  <FormField
                    label={officerStrings.detail.labels.graduationYear}
                    value={graduationYear}
                    onChangeText={(v) => { setGraduationYear(v); markDirty(); }}
                    keyboardType="number-pad"
                  />

                  <SectionLabel title={officerStrings.detail.sections.backgroundInfo} />
                  <SelectField
                    label={officerStrings.detail.labels.criminalRecord}
                    options={BOOL_OPTIONS}
                    value={criminalRecord}
                    onSelect={(v) => { setCriminalRecord(v); markDirty(); }}
                  />
                  <SelectField
                    label={officerStrings.detail.labels.healthIssues}
                    options={BOOL_OPTIONS}
                    value={healthIssues}
                    onSelect={(v) => { setHealthIssues(v); markDirty(); }}
                  />
                  <FormField
                    label={officerStrings.detail.labels.details}
                    value={backgroundDetails}
                    onChangeText={(v) => { setBackgroundDetails(v); markDirty(); }}
                    multiline
                  />

                  <SectionLabel title={officerStrings.detail.sections.positionExpectations} />
                  <FormField
                    label={officerStrings.detail.labels.positionApplied}
                    value={positionApplied}
                    onChangeText={(v) => { setPositionApplied(v); markDirty(); }}
                  />
                  <FormField
                    label={officerStrings.detail.labels.expectedSalary}
                    value={expectedSalary}
                    onChangeText={(v) => { setExpectedSalary(v); markDirty(); }}
                    keyboardType="decimal-pad"
                  />
                  <DateField
                    label={officerStrings.detail.labels.joiningPreference}
                    value={joiningDatePreference}
                    onChange={(v) => { setJoiningDatePreference(v); markDirty(); }}
                  />

                  <Button
                    label={savingPersonal ? 'Saving…' : officerStrings.form.save}
                    onPress={() => void savePersonal()}
                  />
                </>
              ) : null}

              {activeSection === 'contact' ? (
                <>
                  <SectionLabel title={officerStrings.detail.sections.contactInfo} />
                  <FormField
                    label={officerStrings.detail.labels.email}
                    value={email}
                    onChangeText={(v) => { setEmail(v); markDirty(); }}
                    autoCapitalize="none"
                  />
                  <FormField
                    label={officerStrings.detail.labels.phone}
                    value={phone}
                    onChangeText={(v) => { setPhone(v); markDirty(); }}
                    keyboardType="phone-pad"
                  />
                  <FormField
                    label={officerStrings.detail.labels.alternatePhone}
                    value={alternatePhone}
                    onChangeText={(v) => { setAlternatePhone(v); markDirty(); }}
                    keyboardType="phone-pad"
                  />
                  <FormField
                    label={officerStrings.detail.labels.currentAddress}
                    value={currentAddress}
                    onChangeText={(v) => { setCurrentAddress(v); markDirty(); }}
                    multiline
                  />
                  <FormField
                    label={officerStrings.detail.labels.permanentAddress}
                    value={permanentAddress}
                    onChangeText={(v) => { setPermanentAddress(v); markDirty(); }}
                    multiline
                  />
                  <FormField
                    label={officerStrings.detail.labels.city}
                    value={city}
                    onChangeText={(v) => { setCity(v); markDirty(); }}
                  />
                  <FormField
                    label={officerStrings.detail.labels.state}
                    value={stateVal}
                    onChangeText={(v) => { setStateVal(v); markDirty(); }}
                  />
                  <FormField
                    label={officerStrings.detail.labels.pincode}
                    value={pincode}
                    onChangeText={(v) => { setPincode(v); markDirty(); }}
                    keyboardType="number-pad"
                  />

                  <SectionLabel title={officerStrings.detail.sections.bankDetails} />
                  <FormField
                    label={officerStrings.detail.labels.bankName}
                    value={bankName}
                    onChangeText={(v) => { setBankName(v); markDirty(); }}
                  />
                  <FormField
                    label={officerStrings.detail.labels.accountHolder}
                    value={accountHolderName}
                    onChangeText={(v) => { setAccountHolderName(v); markDirty(); }}
                  />
                  <FormField
                    label={officerStrings.detail.labels.accountNumber}
                    value={accountNumber}
                    onChangeText={(v) => { setAccountNumber(v); markDirty(); }}
                    keyboardType="number-pad"
                  />
                  <FormField
                    label={officerStrings.detail.labels.ifsc}
                    value={ifscCode}
                    onChangeText={(v) => { setIfscCode(v); markDirty(); }}
                    autoCapitalize="characters"
                  />

                  <SectionLabel title={officerStrings.detail.sections.emergencyContacts} />
                  {renderEmergencyContact(1, emergencyContact1, setEmergencyContact1)}
                  {renderEmergencyContact(2, emergencyContact2, setEmergencyContact2)}

                  <Button
                    label={savingContact ? 'Saving…' : officerStrings.form.save}
                    onPress={() => void saveContact()}
                  />
                </>
              ) : null}

              {activeSection === 'role' ? (
                <>
                  <SectionLabel title={officerStrings.detail.sections.roleAssignment} />
                  <SelectField
                    label={officerStrings.detail.labels.assignedRole}
                    options={roleOptions}
                    value={roleId}
                    onSelect={(v) => { setRoleId(v); markDirty(); }}
                  />
                  <DateField
                    label={officerStrings.detail.labels.joiningDate}
                    value={joiningDate}
                    onChange={(v) => { setJoiningDate(v); markDirty(); }}
                  />
                  <Button
                    label={savingRole ? 'Saving…' : officerStrings.form.save}
                    onPress={() => void saveRole()}
                  />
                </>
              ) : null}

              <Button label={officerStrings.form.cancel} variant="ghost" onPress={() => navigation.goBack()} style={styles.cancel} />
            </DismissKeyboardScrollView>
          </KeyboardDismissView>
        </KeyboardAvoidingView>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  tabBtn: { flexGrow: 1 },
  cancel: { marginTop: spacing.lg },
  ecBlock: { marginBottom: spacing.md },
});
