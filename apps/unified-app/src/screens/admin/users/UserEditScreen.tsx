import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { FormField, RoleGuard, SelectField } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetOfficersQuery } from '@/services/api/officersApi';
import { useGetAdminUserDetailQuery, useUpdateAdminUserMutation } from '@/store/api/endpoints';
import type { AdminUsersStackParamList } from '@/types/navigation';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminUsersStackParamList, 'UserEdit'>;

export function UserEditScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const { data: user, isLoading, isError, error, refetch } = useGetAdminUserDetailQuery(userId);
  const { data: officers } = useGetOfficersQuery();
  const [updateUser, { isLoading: saving }] = useUpdateAdminUserMutation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [assignedOfficerId, setAssignedOfficerId] = useState('unassigned');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone ?? '');
      setAddress(user.address ?? '');
      setAssignedOfficerId(user.assignedOfficerId ?? 'unassigned');
    }
  }, [user]);

  const officerOptions = useMemo(
    () => [
      { value: 'unassigned' as const, label: 'Unassigned' },
      ...(officers ?? []).map((o) => ({
        value: o.id,
        label: o.name,
      })),
    ],
    [officers],
  );

  const onSave = async () => {
    try {
      await updateUser({
        id: userId,
        name,
        email,
        phone,
        address,
        assignedOfficerId: assignedOfficerId === 'unassigned' ? null : assignedOfficerId,
      }).unwrap();
      Alert.alert('Saved', 'User updated successfully.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
    }
  };

  if (isLoading) return <Screen style={adminScreenStyles.canvas}><SkeletonLoader rows={4} /></Screen>;
  if (isError) return <Screen style={adminScreenStyles.canvas}><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="users.edit">
      <Screen style={adminScreenStyles.canvas}>
        <FormField label="Name" value={name} onChangeText={setName} />
        <FormField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <FormField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <FormField label="Address" value={address} onChangeText={setAddress} multiline />
        <SelectField
          label="Collection officer"
          value={assignedOfficerId}
          options={officerOptions}
          onSelect={setAssignedOfficerId}
          placeholder="Select officer"
        />
        <Text style={styles.helper}>
          Only the assigned officer can view this customer and collect payments in the field app.
        </Text>
        <Button label={saving ? 'Saving…' : 'Save'} onPress={() => void onSave()} style={styles.btn} />
        <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  btn: { marginTop: spacing.md },
  helper: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: -spacing.xs,
  },
});
