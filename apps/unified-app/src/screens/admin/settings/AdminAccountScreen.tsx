import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@prime/ui';

import { FormField, RoleGuard } from '@/components/admin';
import { SaveButton, SettingsHubLayout, SettingsSection } from '@/components/admin/settings';
import { ErrorState, SkeletonLoader } from '@/components/common';
import {
  useGetAdminProfileQuery,
  useUpdateAdminDisplayNameMutation,
  useUpdateAdminEmailMutation,
  useUpdateAdminPasswordMutation,
} from '@/store/api/endpoints';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

export function AdminAccountScreen() {
  const dispatch = useAppDispatch();
  const { data, isLoading, isError, error, refetch } = useGetAdminProfileQuery();
  const [updateName, { isLoading: savingName }] = useUpdateAdminDisplayNameMutation();
  const [updateEmail, { isLoading: savingEmail }] = useUpdateAdminEmailMutation();
  const [updatePassword, { isLoading: savingPassword }] = useUpdateAdminPasswordMutation();

  const [displayName, setDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailBanner, setEmailBanner] = useState(false);

  useEffect(() => {
    if (data) setDisplayName(data.displayName);
  }, [data]);

  const handleSaveName = async () => {
    try {
      await updateName({ displayName }).unwrap();
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: 'Display name saved' }));
    } catch (e) {
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'error', message: queryErrorMessage(e) }));
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) return;
    try {
      await updateEmail({ email: newEmail.trim() }).unwrap();
      setEmailBanner(true);
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: 'Confirmation email sent' }));
    } catch (e) {
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'error', message: queryErrorMessage(e) }));
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'error', message: 'Passwords do not match' }));
      return;
    }
    if (newPassword.length < 8) {
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'error', message: 'Password must be at least 8 characters' }));
      return;
    }
    try {
      await updatePassword({ password: newPassword }).unwrap();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: 'Password updated' }));
    } catch (e) {
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'error', message: queryErrorMessage(e) }));
    }
  };

  const body = isLoading ? (
    <SkeletonLoader rows={6} />
  ) : isError ? (
    <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
  ) : (
    <>
      <SettingsSection title="Profile">
        <FormField label="Display Name" value={displayName} onChangeText={setDisplayName} />
        <SaveButton label="Save Display Name" onPress={handleSaveName} loading={savingName} />
        <FormField label="Login Email (read-only)" value={data?.email ?? ''} editable={false} />
      </SettingsSection>

      <SettingsSection title="Change Email">
        {emailBanner ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              A confirmation link was sent to {newEmail}. Your login email will update after you confirm.
            </Text>
          </View>
        ) : null}
        <FormField label="New Email" value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" />
        <FormField label="Current Password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
        <SaveButton label="Request Email Change" onPress={handleChangeEmail} loading={savingEmail} />
      </SettingsSection>

      <SettingsSection title="Change Password">
        <FormField label="Current Password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
        <FormField label="New Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
        <FormField label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        <SaveButton label="Update Password" onPress={handleChangePassword} loading={savingPassword} />
      </SettingsSection>
    </>
  );

  return (
    <RoleGuard requiredPermission="settings.view">
      <Screen style={styles.screen}>
        <SettingsHubLayout activeRoute="AdminAccount">
          <ScrollView contentContainerStyle={styles.content}>{body}</ScrollView>
        </SettingsHubLayout>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: adminColors.canvasBg },
  content: { padding: 16 },
  banner: {
    backgroundColor: adminColors.badgeWarning + '22',
    borderColor: adminColors.badgeWarning,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  bannerText: { fontSize: 13, color: colors.textPrimary },
});
