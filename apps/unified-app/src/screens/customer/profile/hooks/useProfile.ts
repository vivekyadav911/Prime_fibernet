import { useEffect, useMemo, useState } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

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

  const pickAndUploadPhoto = async () => {
    if (!userId) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Photo library permission required');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingPhoto(true);
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 512 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );
      setPhotoUri(manipulated.uri);
      const publicUrl = await uploadProfilePhoto(userId, manipulated.uri);
      await updateProfile({ userId, profilePictureUrl: publicUrl }).unwrap();
      setPhotoUri(publicUrl);
      await profileQuery.refetch();
    } finally {
      setUploadingPhoto(false);
    }
  };

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
