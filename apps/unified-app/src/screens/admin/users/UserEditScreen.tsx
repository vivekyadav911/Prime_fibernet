import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { FormField, RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetAdminUserDetailQuery, useUpdateAdminUserMutation } from '@/store/api/endpoints';
import type { AdminUsersStackParamList } from '@/types/navigation';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminUsersStackParamList, 'UserEdit'>;

export function UserEditScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const { data: user, isLoading, isError, error, refetch } = useGetAdminUserDetailQuery(userId);
  const [updateUser, { isLoading: saving }] = useUpdateAdminUserMutation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone ?? '');
      setAddress(user.address ?? '');
    }
  }, [user]);

  const onSave = async () => {
    try {
      await updateUser({ id: userId, name, email, phone, address }).unwrap();
      Alert.alert('Saved', 'User updated successfully.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
    }
  };

  if (isLoading) return <Screen><SkeletonLoader rows={4} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="users.edit">
      <Screen>
        <FormField label="Name" value={name} onChangeText={setName} />
        <FormField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <FormField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <FormField label="Address" value={address} onChangeText={setAddress} multiline />
        <Button label={saving ? 'Saving…' : 'Save'} onPress={() => void onSave()} style={styles.btn} />
        <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({ btn: { marginTop: spacing.md } });
