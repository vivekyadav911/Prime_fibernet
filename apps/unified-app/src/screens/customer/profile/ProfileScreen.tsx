import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  CustomerButton,
  CustomerErrorState,
  CustomerSkeletonLoader,
  CustomerToast,
  GlassCard,
} from '@/components/customer/ui';
import { CustomerTopBar } from '@/components/customer/shell';
import { DismissKeyboardScrollView } from '@/components/common';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { signOut } from '@/hooks/useAuth';
import { useAppDispatch } from '@/store/hooks';
import { useCustomerUiStore } from '@/store/customerUiStore';
import type { CustomerTheme } from '@/theme/customer';
import type { CustomerStackParamList } from '@/types/navigation';

import { AppearanceToggle } from './components/AppearanceToggle';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { DeleteAccountModal } from './components/DeleteAccountModal';
import { NotificationToggles } from './components/NotificationToggles';
import { ProfileForm } from './components/ProfileForm';
import { ProfileHeader } from './components/ProfileHeader';

import { useProfile } from './hooks/useProfile';

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  const styles = useThemedStyles(createStyles);
  const dispatch = useAppDispatch();
  const {
    authUser,
    accountId,
    memberSince,
    addressFromServer,
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
          memberSince={memberSince}
          isDev={isDev}
          uploading={uploadingPhoto}
          onChangePhoto={onPhoto}
        />

        <ProfileForm
          defaultValues={defaultValues}
          email={authUser.email}
          accountId={accountId}
          addressHint={
            !addressFromServer
              ? 'No installation address on file yet. Add yours below or contact support if something looks wrong.'
              : undefined
          }
          saving={isSaving}
          onSubmit={onSave}
        />

        <GlassCard padded contentStyle={styles.appearanceCard}>
          <AppearanceToggle />
        </GlassCard>

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

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    screen: { backgroundColor: theme.colors.bgDeep, flex: 1 },
    content: {
      paddingHorizontal: theme.spacing.marginMobile,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xxxl,
      gap: theme.spacing.lg,
    },
    actions: { gap: theme.spacing.sm },
    appearanceCard: { gap: theme.spacing.sm },
  });
