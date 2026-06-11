import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import {
  DateField,
  FormField,
  FormRow,
  RoleGuard,
  SectionLabel,
  SelectField,
} from '@/components/admin';
import { KeyboardDismissView } from '@/components/common';
import { useKeyboardBottomInset } from '@/hooks/useKeyboardBottomInset';
import { AdminCreateUserSchema, type AdminCreateUserFormData } from '@/schemas/adminCreateUser';
import { useCreateAdminUserMutation, useGetPlansQuery } from '@/store/api/endpoints';
import type { AdminUsersStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { parseIndianAddress } from '@/utils/parseIndianAddress';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminUsersStackParamList, 'AddUser'>;

const STATUS_OPTIONS = [
  { value: 'active' as const, label: 'Active' },
  { value: 'blocked' as const, label: 'Blocked' },
];

const ADDRESS_HELPER = 'Enter complete address with city, district, pincode, and state';
const AUTO_FILL_HELPER = 'Auto-filled from address (editable)';

function getMinimumExpiryDate(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

export function AddUserScreen({ navigation }: Props) {
  const keyboardInset = useKeyboardBottomInset(spacing.lg);
  const [createUser, { isLoading: saving }] = useCreateAdminUserMutation();
  const { data: plans = [] } = useGetPlansQuery();

  const planOptions = useMemo(
    () => plans.map((p) => ({ value: p.id, label: p.name })),
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
      Alert.alert('User created', 'The new customer account has been created successfully.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Failed to create user', queryErrorMessage(e));
    }
  };

  return (
    <RoleGuard requiredPermission="users.create">
      <Screen style={styles.canvas} padded={false}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          <KeyboardDismissView style={styles.flex}>
            <ScrollView
              contentContainerStyle={[
                styles.scroll,
                { paddingBottom: spacing.xxxl + keyboardInset },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets
              showsVerticalScrollIndicator={false}
            >
          <View style={styles.card}>
            <SectionLabel title="Required Information" />

            <FormRow>
              <Controller
                control={control}
                name="firstName"
                render={({ field }) => (
                  <FormField
                    label="First Name *"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={errors.firstName?.message}
                    containerStyle={styles.halfField}
                    placeholder="First name"
                  />
                )}
              />
              <Controller
                control={control}
                name="middleName"
                render={({ field }) => (
                  <FormField
                    label="Middle Name"
                    value={field.value ?? ''}
                    onChangeText={field.onChange}
                    containerStyle={styles.halfField}
                    placeholder="Middle name"
                  />
                )}
              />
            </FormRow>

            <Controller
              control={control}
              name="lastName"
              render={({ field }) => (
                <FormField
                  label="Last Name *"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.lastName?.message}
                  placeholder="Last name"
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <FormField
                  label="Email Address *"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.email?.message}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Email address"
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <FormField
                  label="Phone Number *"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.phone?.message}
                  keyboardType="phone-pad"
                  placeholder="Phone number"
                />
              )}
            />

            <Controller
              control={control}
              name="username"
              render={({ field }) => (
                <FormField
                  label="Username *"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.username?.message}
                  autoCapitalize="none"
                  placeholder="Username"
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
                />
              )}
            />
          </View>

          <View style={styles.card}>
            <SectionLabel title="Address Information" />

            <Controller
              control={control}
              name="address"
              render={({ field }) => (
                <FormField
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
                  style={styles.textArea}
                />
              )}
            />

            <FormRow>
              <Controller
                control={control}
                name="city"
                render={({ field }) => (
                  <FormField
                    label="City *"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={errors.city?.message}
                    containerStyle={styles.halfField}
                    placeholder="City"
                    helperText={AUTO_FILL_HELPER}
                  />
                )}
              />
              <Controller
                control={control}
                name="district"
                render={({ field }) => (
                  <FormField
                    label="District *"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={errors.district?.message}
                    containerStyle={styles.halfField}
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
                  <FormField
                    label="Pincode *"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={errors.pincode?.message}
                    containerStyle={styles.halfField}
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
                  <FormField
                    label="State *"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={errors.state?.message}
                    containerStyle={styles.halfField}
                    placeholder="State"
                    helperText={AUTO_FILL_HELPER}
                  />
                )}
              />
            </FormRow>
          </View>

          <View style={styles.card}>
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
                />
              )}
            />
          </View>

          <View style={styles.footer}>
            <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
            <Button
              label={saving ? 'Creating…' : 'Add User'}
              onPress={() => void handleSubmit(onSubmit)()}
              disabled={saving}
            />
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
  canvas: { backgroundColor: adminColors.canvasBg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxxl },
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  halfField: { flex: 1 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
});
