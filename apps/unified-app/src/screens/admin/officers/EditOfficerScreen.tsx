import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { DateField, FormField, RoleGuard, SectionLabel, SelectField } from '@/components/admin';
import { KeyboardDismissView } from '@/components/common';
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
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminOfficersStackParamList, 'OfficerEdit'>;

type EditSection = 'personal' | 'contact' | 'role';

export function EditOfficerScreen({ route, navigation }: Props) {
  const { officerId, section = 'personal' } = route.params;
  const keyboardInset = useKeyboardBottomInset(spacing.lg);
  const initialSection: EditSection =
    section === 'personal' || section === 'contact' || section === 'role' ? section : 'personal';
  const [activeSection, setActiveSection] = useState<EditSection>(initialSection);
  const [dirty, setDirty] = useState(false);

  const { data: profile, isLoading } = useGetOfficerProfileQuery(officerId);
  const { data: roles = [] } = useGetOfficerRolesQuery();

  const [updatePersonal, { isLoading: savingPersonal }] = useUpdateOfficerPersonalMutation();
  const [updateContact, { isLoading: savingContact }] = useUpdateOfficerContactMutation();
  const [updateRole, { isLoading: savingRole }] = useUpdateOfficerRoleMutation();

  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('Single');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [pincode, setPincode] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [roleId, setRoleId] = useState('');
  const [joiningDate, setJoiningDate] = useState('');

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName);
    setDateOfBirth(profile.dateOfBirth ?? '');
    setGender(profile.gender ?? 'Male');
    setBloodGroup(profile.bloodGroup ?? '');
    setMaritalStatus(profile.maritalStatus ?? 'Single');
    setEmail(profile.email);
    setPhone(profile.phone);
    setCity(profile.city ?? '');
    setStateVal(profile.state ?? '');
    setPincode(profile.pincode ?? '');
    setCurrentAddress(profile.currentAddress ?? '');
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
      }).unwrap();
      setDirty(false);
      Alert.alert('Saved', 'Personal information updated.');
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
        city,
        state: stateVal,
        pincode,
        currentAddress,
      }).unwrap();
      setDirty(false);
      Alert.alert('Saved', 'Contact information updated.');
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

  if (isLoading || !profile) {
    return <Screen style={adminScreenStyles.canvas}><Text>Loading…</Text></Screen>;
  }

  const roleOptions = roles.map((r) => ({ value: r.id, label: r.name }));

  return (
    <RoleGuard requiredPermission="officers.edit">
      <Screen style={adminScreenStyles.canvas}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={keyboardInset}>
          <KeyboardDismissView>
            <ScrollView contentContainerStyle={styles.scroll}>
              <View style={styles.tabs}>
                {(['personal', 'contact', 'role'] as EditSection[]).map((s) => (
                  <Button
                    key={s}
                    label={s}
                    variant={activeSection === s ? 'primary' : 'ghost'}
                    onPress={() => setActiveSection(s)}
                    style={styles.tabBtn}
                  />
                ))}
              </View>

              {activeSection === 'personal' ? (
                <>
                  <SectionLabel title={officerStrings.detail.sections.personalInfo} />
                  <FormField label="Full Name" value={fullName} onChangeText={(v) => { setFullName(v); markDirty(); }} />
                  <DateField label="Date of Birth" value={dateOfBirth} onChange={(v) => { setDateOfBirth(v); markDirty(); }} />
                  <SelectField label="Gender" options={GENDER_OPTIONS} value={gender} onSelect={(v) => { setGender(v); markDirty(); }} />
                  <FormField label="Blood Group" value={bloodGroup} onChangeText={(v) => { setBloodGroup(v); markDirty(); }} />
                  <SelectField label="Marital Status" options={MARITAL_STATUS_OPTIONS} value={maritalStatus} onSelect={(v) => { setMaritalStatus(v); markDirty(); }} />
                  <Button label={savingPersonal ? 'Saving…' : officerStrings.form.save} onPress={() => void savePersonal()} />
                </>
              ) : null}

              {activeSection === 'contact' ? (
                <>
                  <SectionLabel title={officerStrings.detail.sections.contactInfo} />
                  <FormField label="Email" value={email} onChangeText={(v) => { setEmail(v); markDirty(); }} autoCapitalize="none" />
                  <FormField label="Phone" value={phone} onChangeText={(v) => { setPhone(v); markDirty(); }} keyboardType="phone-pad" />
                  <FormField label="City" value={city} onChangeText={(v) => { setCity(v); markDirty(); }} />
                  <FormField label="State" value={stateVal} onChangeText={(v) => { setStateVal(v); markDirty(); }} />
                  <FormField label="Pincode" value={pincode} onChangeText={(v) => { setPincode(v); markDirty(); }} keyboardType="number-pad" />
                  <FormField label="Current Address" value={currentAddress} onChangeText={(v) => { setCurrentAddress(v); markDirty(); }} multiline />
                  <Button label={savingContact ? 'Saving…' : officerStrings.form.save} onPress={() => void saveContact()} />
                </>
              ) : null}

              {activeSection === 'role' ? (
                <>
                  <SectionLabel title={officerStrings.detail.sections.roleAssignment} />
                  <SelectField label="Assigned Role" options={roleOptions} value={roleId} onSelect={(v) => { setRoleId(v); markDirty(); }} />
                  <DateField label="Joining Date" value={joiningDate} onChange={(v) => { setJoiningDate(v); markDirty(); }} />
                  <Button label={savingRole ? 'Saving…' : officerStrings.form.save} onPress={() => void saveRole()} />
                </>
              ) : null}

              <Button label={officerStrings.form.cancel} variant="ghost" onPress={() => navigation.goBack()} style={styles.cancel} />
            </ScrollView>
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
});
