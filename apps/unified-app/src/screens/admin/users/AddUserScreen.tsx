import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { DateField, FormRow, RoleGuard, SelectField } from '@/components/admin';
import { KeyboardDismissView } from '@/components/common';
import { AdminCreateUserSchema, type AdminCreateUserFormData } from '@/schemas/adminCreateUser';
import { useCreateAdminUserMutation } from '@/store/api/endpoints';
import { fetchPlans, updateSubscriberCount } from '@/services/planService';
import type { Plan } from '@/types/plans';
import type { AdminUsersStackParamList } from '@/types/navigation';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { parseIndianAddress } from '@/utils/parseIndianAddress';
import { queryErrorMessage } from '@/utils/queryError';

import { BTN_H, formStyles } from './addUserFormStyles';
import { AddUserFormField } from './components/AddUserFormField';
import { AddUserSectionCard } from './components/AddUserSectionCard';
import { ui } from './usersUi';

type Props = NativeStackScreenProps<AdminUsersStackParamList, 'AddUser'>;

const STATUS_OPTIONS = [
  { value: 'active' as const, label: 'Active' },
  { value: 'inactive' as const, label: 'Inactive' },
];

const ADDRESS_HELPER = 'Enter complete address with city, district, pincode, and state';
const AUTO_FILL_HELPER = 'Auto-filled from address (editable)';

const SETUP_STEPS = [
  { id: 'basic', label: 'Basic details' },
  { id: 'address', label: 'Address' },
  { id: 'service', label: 'Service setup' },
] as const;

const selectFieldProps = {
  containerStyle: formStyles.fieldWrap,
  triggerStyle: formStyles.trigger,
  triggerTextStyle: formStyles.triggerText,
} as const;

function getMinimumExpiryDate(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

export function AddUserScreen({ navigation }: Props) {
  const [createUser, { isLoading: saving }] = useCreateAdminUserMutation();
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    void fetchPlans({ status: 'active' })
      .then(setPlans)
      .catch(() => setPlans([]));
  }, []);

  const planOptions = useMemo(
    () => plans.map((p) => ({ value: p.id, label: p.displayName || p.name })),
    [plans],
  );
  const minimumExpiryDate = useMemo(() => getMinimumExpiryDate(), []);

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<AdminCreateUserFormData>({
    resolver: zodResolver(AdminCreateUserSchema),
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      phone: '',
      username: '',
      planId: '',
      status: 'active',
      address: '',
      city: '',
      district: '',
      pincode: '',
      state: '',
      expiryDate: '',
    },
  });

  const handleAddressBlur = () => {
    const address = getValues('address');
    const parsed = parseIndianAddress(address);
    if (parsed.city && !getValues('city')) setValue('city', parsed.city);
    if (parsed.district && !getValues('district')) setValue('district', parsed.district);
    if (parsed.pincode && !getValues('pincode')) setValue('pincode', parsed.pincode);
    if (parsed.state && !getValues('state')) setValue('state', parsed.state);
  };

  const onSubmit = async (data: AdminCreateUserFormData) => {
    try {
      await createUser({
        firstName: data.firstName,
        middleName: data.middleName || undefined,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        username: data.username,
        planId: data.planId,
        status: data.status,
        address: data.address,
        city: data.city,
        district: data.district,
        pincode: data.pincode,
        state: data.state,
        expiryDate: data.expiryDate,
      }).unwrap();
      if (data.planId) {
        await updateSubscriberCount(data.planId, 1);
      }
      Alert.alert('User created', 'The new customer account has been created successfully.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Failed to create user', queryErrorMessage(e));
    }
  };

  return (
    <RoleGuard requiredPermission="users.create">
      <Screen padded={false} safeAreaTop={false} style={adminScreenStyles.canvas}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          <KeyboardDismissView style={styles.flex}>
            <ScrollView
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.introCard}>
                <Text style={styles.introTitle}>Add New User</Text>
                <Text style={styles.introSubtitle}>
                  Create a new subscriber profile and assign plan details.
                </Text>
                <View style={styles.stepsRow}>
                  {SETUP_STEPS.map((step, index) => (
                    <View key={step.id} style={styles.stepItem}>
                      <View style={styles.stepDot}>
                        <Text style={styles.stepDotText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.stepLabel}>{step.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <AddUserSectionCard
                title="Required Information"
                subtitle="Subscriber identity, contact, and account credentials."
              >
                <FormRow>
                  <Controller
                    control={control}
                    name="firstName"
                    render={({ field }) => (
                      <AddUserFormField
                        label="First Name *"
                        value={field.value}
                        onChangeText={field.onChange}
                        error={errors.firstName?.message}
                        containerStyle={formStyles.halfField}
                        placeholder="First name"
                        returnKeyType="next"
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="middleName"
                    render={({ field }) => (
                      <AddUserFormField
                        label="Middle Name"
                        value={field.value ?? ''}
                        onChangeText={field.onChange}
                        containerStyle={formStyles.halfField}
                        placeholder="Middle name"
                        returnKeyType="next"
                      />
                    )}
                  />
                </FormRow>

                <Controller
                  control={control}
                  name="lastName"
                  render={({ field }) => (
                    <AddUserFormField
                      label="Last Name *"
                      value={field.value}
                      onChangeText={field.onChange}
                      error={errors.lastName?.message}
                      placeholder="Last name"
                      returnKeyType="next"
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="email"
                  render={({ field }) => (
                    <AddUserFormField
                      label="Email Address *"
                      value={field.value}
                      onChangeText={field.onChange}
                      error={errors.email?.message}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      placeholder="Email address"
                      returnKeyType="next"
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="phone"
                  render={({ field }) => (
                    <AddUserFormField
                      label="Phone Number *"
                      value={field.value}
                      onChangeText={field.onChange}
                      error={errors.phone?.message}
                      keyboardType="phone-pad"
                      placeholder="Phone number"
                      returnKeyType="next"
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="username"
                  render={({ field }) => (
                    <AddUserFormField
                      label="Username *"
                      value={field.value}
                      onChangeText={field.onChange}
                      error={errors.username?.message}
                      autoCapitalize="none"
                      placeholder="Username"
                      returnKeyType="next"
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="planId"
                  render={({ field }) => (
                    <SelectField
                      label="Plan *"
                      value={field.value}
                      options={planOptions}
                      onSelect={field.onChange}
                      error={errors.planId?.message}
                      placeholder="Select plan"
                      {...selectFieldProps}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <SelectField
                      label="Status *"
                      value={field.value}
                      options={STATUS_OPTIONS}
                      onSelect={field.onChange}
                      error={errors.status?.message}
                      {...selectFieldProps}
                    />
                  )}
                />
              </AddUserSectionCard>

              <AddUserSectionCard
                title="Address Information"
                subtitle="Service location for installation and billing."
              >
                <Controller
                  control={control}
                  name="address"
                  render={({ field }) => (
                    <AddUserFormField
                      label="Full Address *"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={() => {
                        field.onBlur();
                        handleAddressBlur();
                      }}
                      error={errors.address?.message}
                      multiline
                      numberOfLines={3}
                      placeholder="Full address"
                      helperText={ADDRESS_HELPER}
                      style={formStyles.textArea}
                    />
                  )}
                />

                <FormRow>
                  <Controller
                    control={control}
                    name="city"
                    render={({ field }) => (
                      <AddUserFormField
                        label="City *"
                        value={field.value}
                        onChangeText={field.onChange}
                        error={errors.city?.message}
                        containerStyle={formStyles.halfField}
                        placeholder="City"
                        helperText={AUTO_FILL_HELPER}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="district"
                    render={({ field }) => (
                      <AddUserFormField
                        label="District *"
                        value={field.value}
                        onChangeText={field.onChange}
                        error={errors.district?.message}
                        containerStyle={formStyles.halfField}
                        placeholder="District"
                        helperText={AUTO_FILL_HELPER}
                      />
                    )}
                  />
                </FormRow>

                <FormRow>
                  <Controller
                    control={control}
                    name="pincode"
                    render={({ field }) => (
                      <AddUserFormField
                        label="Pincode *"
                        value={field.value}
                        onChangeText={field.onChange}
                        error={errors.pincode?.message}
                        containerStyle={formStyles.halfField}
                        keyboardType="number-pad"
                        placeholder="Pincode"
                        helperText={AUTO_FILL_HELPER}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="state"
                    render={({ field }) => (
                      <AddUserFormField
                        label="State *"
                        value={field.value}
                        onChangeText={field.onChange}
                        error={errors.state?.message}
                        containerStyle={formStyles.halfField}
                        placeholder="State"
                        helperText={AUTO_FILL_HELPER}
                      />
                    )}
                  />
                </FormRow>
              </AddUserSectionCard>

              <AddUserSectionCard
                title="Service Setup"
                subtitle="Set the subscription expiry for this subscriber."
              >
                <Controller
                  control={control}
                  name="expiryDate"
                  render={({ field }) => (
                    <DateField
                      label="Expiry Date *"
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.expiryDate?.message}
                      placeholder="Select expiry date"
                      minimumDate={minimumExpiryDate}
                      accentColor={ui.brand}
                      accentTint="rgba(91, 79, 233, 0.08)"
                      containerStyle={formStyles.fieldWrap}
                      triggerStyle={formStyles.trigger}
                      triggerTextStyle={formStyles.triggerText}
                    />
                  )}
                />
              </AddUserSectionCard>

              <View style={styles.footer}>
                <Pressable
                  onPress={() => navigation.goBack()}
                  style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleSubmit(onSubmit)()}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    saving && styles.submitBtnDisabled,
                    pressed && !saving && styles.btnPressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.submitBtnText}>{saving ? 'Creating…' : 'Add User'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardDismissView>
        </KeyboardAvoidingView>
      </Screen>
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
  stepsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ui.searchFill,
    borderRadius: ui.radiusPill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: ui.touch,
    justifyContent: 'center',
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: ui.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: ui.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 4,
  },
  cancelBtn: {
    minHeight: BTN_H,
    paddingHorizontal: 18,
    borderRadius: ui.btnRadius,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: ui.touch,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.textSecondary,
  },
  submitBtn: {
    minHeight: BTN_H,
    paddingHorizontal: 22,
    borderRadius: ui.btnRadius,
    backgroundColor: ui.brand,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  submitBtnDisabled: { opacity: 0.55 },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  btnPressed: { opacity: 0.9 },
});
