import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Screen } from '@prime/ui';

import { ErrorState, SkeletonLoader } from '@/components/common';
import { signOut } from '@/hooks/useAuth';
import { useAppDispatch } from '@/store/hooks';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import { ChangePasswordModal } from './components/ChangePasswordModal';
import { DeleteAccountModal } from './components/DeleteAccountModal';
import { NotificationToggles } from './components/NotificationToggles';
import { ProfileForm } from './components/ProfileForm';
import { ProfileHeader } from './components/ProfileHeader';
import { useProfile } from './hooks/useProfile';

export function ProfileScreen() {
  const dispatch = useAppDispatch();
  const {
    authUser,
    profilePictureUrl,
    defaultValues,
    pushEnabled,
    emailEnabled,
    smsEnabled,
    setPushEnabled,
    setEmailEnabled,
    setSmsEnabled,
    isLoading,
    error,
    refetch,
    saveProfile,
    saveNotificationPrefs,
    pickAndUploadPhoto,
    uploadingPhoto,
    updatePassword,
    deleteAccount,
    isSaving,
    isChangingPassword,
    isDeleting,
    isDev,
  } = useProfile();

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  if (error) {
    return (
      <Screen>
        <ErrorState message="Failed to load profile" onRetry={refetch} />
      </Screen>
    );
  }

  if (isLoading || !authUser) {
    return (
      <Screen>
        <SkeletonLoader rows={6} rowHeight={48} shape="card" />
      </Screen>
    );
  }

  const onSave = async (values: Parameters<typeof saveProfile>[0]) => {
    try {
      await saveProfile(values);
      await saveNotificationPrefs();
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save profile');
    }
  };

  const onPhoto = async () => {
    try {
      await pickAndUploadPhoto();
      Alert.alert('Updated', 'Profile photo saved.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not update photo');
    }
  };

  const onPassword = async (password: string) => {
    try {
      await updatePassword(password);
      Alert.alert('Success', 'Password updated.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not change password');
    }
  };

  const onDelete = async () => {
    try {
      await deleteAccount();
      setDeleteModalVisible(false);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete account');
    }
  };

  return (
    <Screen padded={false} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <ProfileHeader
          name={defaultValues.name || authUser.name}
          email={authUser.email}
          photoUrl={profilePictureUrl}
          isDev={isDev}
          uploading={uploadingPhoto}
          onChangePhoto={onPhoto}
        />

        <ProfileForm defaultValues={defaultValues} saving={isSaving} onSubmit={onSave} />

        <NotificationToggles
          pushEnabled={pushEnabled}
          emailEnabled={emailEnabled}
          smsEnabled={smsEnabled}
          onPushChange={setPushEnabled}
          onEmailChange={setEmailEnabled}
          onSmsChange={setSmsEnabled}
        />

        <View style={styles.actions}>
          <Button label="Change password" variant="secondary" onPress={() => setPasswordModalVisible(true)} />
          <Button label="Delete account" variant="secondary" onPress={() => setDeleteModalVisible(true)} />
          <Button label="Sign out" onPress={() => signOut(dispatch)} />
        </View>
      </ScrollView>

      <ChangePasswordModal
        visible={passwordModalVisible}
        loading={isChangingPassword}
        onClose={() => setPasswordModalVisible(false)}
        onSubmit={onPassword}
      />
      <DeleteAccountModal
        visible={deleteModalVisible}
        loading={isDeleting}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={onDelete}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxxl },
  actions: { gap: spacing.sm },
});
