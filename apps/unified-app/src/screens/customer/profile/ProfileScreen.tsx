import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { CustomerButton } from '@/components/customer/ui';
import { ErrorState, SkeletonLoader } from '@/components/common';
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
  const darkMode = useCustomerUiStore((s) => s.darkMode);
  const setDarkMode = useCustomerUiStore((s) => s.setDarkMode);

  if (error) {
    return (
      <View style={styles.screen}>
        <ErrorState message="Failed to load profile" onRetry={refetch} />
      </View>
    );
  }

  if (isLoading || !authUser) {
    return (
      <View style={styles.screen}>
        <SkeletonLoader rows={6} rowHeight={48} shape="card" />
      </View>
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
    <View style={styles.screen}>
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

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Dark mode (Signal Glass)</Text>
          <Switch value={darkMode} onValueChange={setDarkMode} />
        </View>

        <View style={styles.actions}>
          <CustomerButton label="Billing & payments" variant="ghost" onPress={() => navigation.navigate('CustomerTabs', { screen: 'Payments' })} />
          <CustomerButton label="Notifications" variant="ghost" onPress={() => navigation.navigate('Notifications')} />
          <CustomerButton label="Change password" variant="ghost" onPress={() => setPasswordModalVisible(true)} />
          <CustomerButton label="Sign out" onPress={() => signOut(dispatch)} />
          <CustomerButton label="Delete account" variant="danger" onPress={() => setDeleteModalVisible(true)} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: signalGlass.colors.bgDeep, flex: 1 },
  content: { padding: signalGlass.spacing.lg, gap: signalGlass.spacing.lg, paddingBottom: signalGlass.spacing.xxxl },
  actions: { gap: signalGlass.spacing.sm },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: signalGlass.spacing.md,
    backgroundColor: signalGlass.colors.bgSurface,
    borderRadius: signalGlass.radius.sm,
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
  },
  toggleLabel: { color: signalGlass.colors.textPrimary, fontWeight: '600' },
});
