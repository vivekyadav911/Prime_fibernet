import { useCallback, useEffect, useMemo, useState } from 'react';

import { useCamera } from '@/hooks/useCamera';
import { signOut } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  useChangePasswordMutation,
  useGetCustomerUserRecordQuery,
  useRequestAccountDeletionMutation,
  useUpdateProfileMutation,
} from '@/store/api/endpoints';
import { formatCustomerAccountId, formatInstallationAddress } from '@/utils/customerAccount';
import { uploadProfilePhoto } from '@/utils/uploadProfilePhoto';

export type ProfileFormValues = {
  name: string;
  phone: string;
  address: string;
};

function formatMemberSince(createdAt: string | null | undefined): string | undefined {
  if (!createdAt) return undefined;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function useProfile() {
  const { pickFromGallery } = useCamera();
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((s) => s.auth.user);

  const profileQuery = useGetCustomerUserRecordQuery(undefined, { skip: !authUser });
  const [updateProfile, updateState] = useUpdateProfileMutation();
  const [changePassword, changePasswordState] = useChangePasswordMutation();
  const [requestDeletion, deletionState] = useRequestAccountDeletionMutation();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const dbUser = profileQuery.data;
  const customerUserId = typeof dbUser?.id === 'string' ? dbUser.id : '';

  const profilePictureUrl =
    photoUri ?? (typeof dbUser?.profile_picture_url === 'string' ? dbUser.profile_picture_url : null);

  const notificationPrefs = useMemo(() => {
    const prefs = dbUser?.notification_prefs;
    if (!prefs || typeof prefs !== 'object') return { push: true, email: true, sms: false };
    const map = prefs as Record<string, unknown>;
    return {
      push: map.push !== false,
      email: map.email !== false,
      sms: map.sms === true,
    };
  }, [dbUser?.notification_prefs]);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);

  useEffect(() => {
    setPushEnabled(notificationPrefs.push);
    setEmailEnabled(notificationPrefs.email);
    setSmsEnabled(notificationPrefs.sms);
  }, [notificationPrefs.push, notificationPrefs.email, notificationPrefs.sms]);

  const installationAddress = useMemo(() => formatInstallationAddress(dbUser ?? undefined), [dbUser]);

  const defaultValues: ProfileFormValues = useMemo(
    () => ({
      name: (dbUser?.name as string) ?? authUser?.name ?? '',
      phone: (dbUser?.phone as string) ?? '',
      address: installationAddress,
    }),
    [authUser?.name, dbUser?.name, dbUser?.phone, installationAddress],
  );

  const saveProfile = async (values: ProfileFormValues) => {
    if (!customerUserId) throw new Error('Sign in required');
    await updateProfile({
      userId: customerUserId,
      name: values.name.trim(),
      phone: values.phone.trim() || undefined,
      address: values.address.trim() || undefined,
      notificationPrefs: { push: pushEnabled, email: emailEnabled, sms: smsEnabled },
    }).unwrap();
    await profileQuery.refetch();
  };

  const saveNotificationPrefs = async () => {
    if (!customerUserId) return;
    await updateProfile({
      userId: customerUserId,
      notificationPrefs: { push: pushEnabled, email: emailEnabled, sms: smsEnabled },
    }).unwrap();
  };

  const pickAndUploadPhoto = useCallback(async () => {
    if (!customerUserId) throw new Error('Sign in required');
    try {
      const uri = await pickFromGallery();
      setUploadingPhoto(true);
      setPhotoUri(uri);
      const publicUrl = await uploadProfilePhoto(customerUserId, uri);
      await updateProfile({ userId: customerUserId, profilePictureUrl: publicUrl }).unwrap();
      setPhotoUri(publicUrl);
      await profileQuery.refetch();
    } catch (e) {
      if (e instanceof Error && e.message === 'No image selected') return;
      throw e;
    } finally {
      setUploadingPhoto(false);
    }
  }, [customerUserId, pickFromGallery, profileQuery, updateProfile]);

  const updatePassword = async (newPassword: string) => {
    await changePassword({ newPassword }).unwrap();
  };

  const deleteAccount = async () => {
    if (!customerUserId) return;
    await requestDeletion({ userId: customerUserId }).unwrap();
    await signOut(dispatch);
  };

  const accountId = formatCustomerAccountId(
    typeof dbUser?.customer_id === 'string' ? dbUser.customer_id : null,
  );

  const memberSince = formatMemberSince(
    typeof dbUser?.created_at === 'string' ? dbUser.created_at : null,
  );

  return {
    authUser,
    accountId,
    memberSince,
    profilePictureUrl,
    defaultValues,
    addressFromServer: installationAddress,
    pushEnabled,
    emailEnabled,
    smsEnabled,
    setPushEnabled,
    setEmailEnabled,
    setSmsEnabled,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    refetch: profileQuery.refetch,
    saveProfile,
    saveNotificationPrefs,
    pickAndUploadPhoto,
    uploadingPhoto,
    updatePassword,
    deleteAccount,
    isSaving: updateState.isLoading,
    isChangingPassword: changePasswordState.isLoading,
    isDeleting: deletionState.isLoading,
    isDev: authUser?.email?.endsWith('@prime.local') ?? false,
  };
}
