import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@prime/ui';

import { AvatarIcon, RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { SettingsHubLayout } from '@/components/admin/settings';
import {
  useGetAdminProfileQuery,
  useUpdateAdminDisplayNameMutation,
  useUpdateAdminEmailMutation,
  useUpdateAdminPasswordMutation,
} from '@/store/api/endpoints';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { queryErrorMessage } from '@/utils/queryError';

import { ui } from './adminAccountUi';
import { AdminAccountFormField } from './components/AdminAccountFormField';
import { AdminAccountPrimaryButton } from './components/AdminAccountPrimaryButton';
import { AdminAccountSectionCard } from './components/AdminAccountSectionCard';

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

  const summaryName = displayName.trim() || data?.displayName || 'Admin';

  const body = isLoading ? (
    <SkeletonLoader rows={6} />
  ) : isError ? (
    <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
  ) : (
    <>
      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <AvatarIcon name={summaryName} size={52} />
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>Admin Account</Text>
            <Text style={styles.summarySubtitle}>
              Manage your profile, email, and account security.
            </Text>
          </View>
        </View>
        <View style={styles.summaryBadge}>
          <Text style={styles.summaryBadgeText}>Administrator</Text>
        </View>
      </View>

      <AdminAccountSectionCard
        title="Profile"
        subtitle="Update how your name appears across the admin console."
      >
        <AdminAccountFormField
          label="Display Name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Enter display name"
        />
        <AdminAccountPrimaryButton label="Save Display Name" onPress={handleSaveName} loading={savingName} />
        <View style={styles.fieldDivider} />
        <AdminAccountFormField
          label="Login Email (read-only)"
          value={data?.email ?? ''}
          readOnly
          helperText="Your sign-in email. Use Change Email below to update it."
        />
      </AdminAccountSectionCard>

      <AdminAccountSectionCard
        title="Change Email"
        subtitle="A confirmation link will be sent to your new address."
      >
        {emailBanner ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              A confirmation link was sent to {newEmail}. Your login email will update after you confirm.
            </Text>
          </View>
        ) : null}
        <AdminAccountFormField
          label="New Email"
          value={newEmail}
          onChangeText={setNewEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="new-email@example.com"
        />
        <AdminAccountFormField
          label="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          placeholder="Enter current password"
        />
        <AdminAccountPrimaryButton
          label="Request Email Change"
          onPress={handleChangeEmail}
          loading={savingEmail}
        />
      </AdminAccountSectionCard>

      <AdminAccountSectionCard
        title="Change Password"
        subtitle="Choose a strong password with at least 8 characters."
      >
        <AdminAccountFormField
          label="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          placeholder="Enter current password"
        />
        <AdminAccountFormField
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="At least 8 characters"
        />
        <AdminAccountFormField
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="Re-enter new password"
        />
        <AdminAccountPrimaryButton
          label="Update Password"
          onPress={handleChangePassword}
          loading={savingPassword}
        />
      </AdminAccountSectionCard>
    </>
  );

  return (
    <RoleGuard requiredPermission="settings.view">
      <Screen padded={false} safeAreaTop={false} style={styles.screen}>
        <SettingsHubLayout activeRoute="AdminAccount">
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {body}
          </ScrollView>
        </SettingsHubLayout>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { backgroundColor: ui.bg, flex: 1 },
  content: {
    paddingHorizontal: ui.pagePad,
    paddingTop: 12,
    paddingBottom: 32,
    gap: ui.sectionGap,
  },
  summaryCard: {
    backgroundColor: ui.card,
    borderRadius: ui.radiusHero,
    padding: ui.cardPad,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ui.border,
    gap: 14,
    ...ui.shadow,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  summaryText: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ui.text,
    letterSpacing: -0.3,
  },
  summarySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: ui.textSecondary,
    lineHeight: 20,
  },
  summaryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(91, 79, 233, 0.08)',
    borderRadius: ui.radiusPill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: ui.brand,
  },
  fieldDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: ui.border,
    marginVertical: 4,
  },
  banner: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: ui.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '500',
    color: ui.text,
    lineHeight: 18,
  },
});
