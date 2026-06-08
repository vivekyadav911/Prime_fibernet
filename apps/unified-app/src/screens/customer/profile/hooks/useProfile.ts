import { useCallback, useEffect, useMemo, useState } from 'react';

import { useCamera } from '@/hooks/useCamera';
import { signOut } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  useChangePasswordMutation,
  useGetUserByIdQuery,
  useRequestAccountDeletionMutation,
  useUpdateProfileMutation,
} from '@/store/api/endpoints';
import { uploadProfilePhoto } from '@/utils/uploadProfilePhoto';

export type ProfileFormValues = {
  name: string;
  phone: string;
  address: string;
};

export function useProfile() {
  const { pickFromGallery } = useCamera();
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((s) => s.auth.user);
  const userId = authUser?.id ?? '';

  const profileQuery = useGetUserByIdQuery(userId, { skip: !userId });
  const [updateProfile, updateState] = useUpdateProfileMutation();
  const [changePassword, changePasswordState] = useChangePasswordMutation();
  const [requestDeletion, deletionState] = useRequestAccountDeletionMutation();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const dbUser = profileQuery.data;
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

  const defaultValues: ProfileFormValues = useMemo(
    () => ({
      name: (dbUser?.name as string) ?? authUser?.name ?? '',
      phone: (dbUser?.phone as string) ?? '',
      address: (dbUser?.address as string) ?? '',
    }),
    [authUser?.name, dbUser?.address, dbUser?.name, dbUser?.phone],
  );

  const saveProfile = async (values: ProfileFormValues) => {
    if (!userId) throw new Error('Sign in required');
    await updateProfile({
      userId,
      name: values.name.trim(),
      phone: values.phone.trim() || undefined,
      address: values.address.trim() || undefined,
      notificationPrefs: { push: pushEnabled, email: emailEnabled, sms: smsEnabled },
    }).unwrap();
    await profileQuery.refetch();
  };

  const saveNotificationPrefs = async () => {
    if (!userId) return;
    await updateProfile({
      userId,
      notificationPrefs: { push: pushEnabled, email: emailEnabled, sms: smsEnabled },
    }).unwrap();
  };

  const pickAndUploadPhoto = useCallback(async () => {
    if (!userId) return;
    try {
      const uri = await pickFromGallery();
      setUploadingPhoto(true);
      setPhotoUri(uri);
      const publicUrl = await uploadProfilePhoto(userId, uri);
      await updateProfile({ userId, profilePictureUrl: publicUrl }).unwrap();
      setPhotoUri(publicUrl);
      await profileQuery.refetch();
    } catch (e) {
      if (e instanceof Error && e.message === 'No image selected') return;
      throw e;
    } finally {
      setUploadingPhoto(false);
    }
  }, [pickFromGallery, profileQuery, updateProfile, userId]);

  const updatePassword = async (newPassword: string) => {
    await changePassword({ newPassword }).unwrap();
  };

  const deleteAccount = async () => {
    if (!userId) return;
    await requestDeletion({ userId }).unwrap();
    await signOut(dispatch);
  };

  return {
    authUser,
    profilePictureUrl,
    defaultValues,
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
