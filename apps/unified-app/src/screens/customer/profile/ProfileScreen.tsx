import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  CustomerButton,
  CustomerErrorState,
  CustomerSkeletonLoader,
  CustomerToast,
} from '@/components/customer/ui';
import { CustomerTopBar } from '@/components/customer/shell';
import { DismissKeyboardScrollView } from '@/components/common';
import { signOut } from '@/hooks/useAuth';
import { useAppDispatch } from '@/store/hooks';
import { useCustomerUiStore } from '@/store/customerUiStore';
import { signalGlass } from '@/theme/customer/signalGlass';
import type { CustomerStackParamList } from '@/types/navigation';

import { ChangePasswordModal } from './components/ChangePasswordModal';
import { DeleteAccountModal } from './components/DeleteAccountModal';
import { NotificationToggles } from './components/NotificationToggles';
import { ProfileForm } from './components/ProfileForm';
import { ProfileHeader } from './components/ProfileHeader';

import { useProfile } from './hooks/useProfile';

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
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
  const toast = useCustomerUiStore((s) => s.toast);
  const clearToast = useCustomerUiStore((s) => s.clearToast);
  const showToast = useCustomerUiStore((s) => s.showToast);

  if (error) {
    return (
      <View style={styles.screen}>
        <CustomerTopBar onNotificationsPress={() => navigation.navigate('Notifications')} />
        <CustomerErrorState message="Failed to load profile. Try again." onRetry={refetch} />
      </View>
    );
  }

  if (isLoading || !authUser) {
    return (
      <View style={styles.screen}>
        <CustomerTopBar onNotificationsPress={() => navigation.navigate('Notifications')} />
        <CustomerSkeletonLoader rows={6} rowHeight={48} />
      </View>
    );
  }

  const onSave = async (values: Parameters<typeof saveProfile>[0]) => {
    try {
      await saveProfile(values);
      await saveNotificationPrefs();
      showToast('Profile saved', 'Your changes have been updated.');
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again in a moment.');
    }
  };

  const onPhoto = async () => {
    try {
      await pickAndUploadPhoto();
      showToast('Photo updated', 'Your profile photo has been saved.');
    } catch (e) {
      Alert.alert('Could not update photo', e instanceof Error ? e.message : 'Try again.');
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
    <View style={styles.screen}>
      <CustomerToast
        title={toast?.title ?? ''}
        body={toast?.body}
        visible={Boolean(toast)}
        onDismiss={clearToast}
      />
      <CustomerTopBar onNotificationsPress={() => navigation.navigate('Notifications')} />
      <DismissKeyboardScrollView contentContainerStyle={styles.content}>
        <ProfileHeader
          name={defaultValues.name || authUser.name}
          email={authUser.email}
          photoUrl={profilePictureUrl}
          isDev={isDev}
          uploading={uploadingPhoto}
          onChangePhoto={onPhoto}
        />

        <ProfileForm
          defaultValues={defaultValues}
          email={authUser.email}
          accountId={authUser.id ? `PFN-${authUser.id.slice(0, 8).toUpperCase()}` : undefined}
          saving={isSaving}
          onSubmit={onSave}
        />

        <NotificationToggles
          pushEnabled={pushEnabled}
          emailEnabled={emailEnabled}
          smsEnabled={smsEnabled}
          onPushChange={setPushEnabled}
          onEmailChange={setEmailEnabled}
          onSmsChange={setSmsEnabled}
        />

        <View style={styles.actions}>
          <CustomerButton label="Notifications" variant="outline" onPress={() => navigation.navigate('Notifications')} />
          <CustomerButton label="Change password" variant="outline" onPress={() => setPasswordModalVisible(true)} />
          <CustomerButton label="Sign out" variant="ghost" onPress={() => signOut(dispatch)} />
          <CustomerButton label="Delete account" variant="danger" onPress={() => setDeleteModalVisible(true)} />
        </View>
      </DismissKeyboardScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: signalGlass.colors.bgDeep, flex: 1 },
  content: {
    paddingHorizontal: signalGlass.spacing.marginMobile,
    paddingTop: signalGlass.spacing.md,
    paddingBottom: signalGlass.spacing.xxxl,
    gap: signalGlass.spacing.lg,
  },
  actions: { gap: signalGlass.spacing.sm },
});
