import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import { getSupabase } from '@/services/supabase';

const COMPRESS_QUALITY = 0.7;
const MAX_DIMENSION = 1200;

async function compressImage(uri: string): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: COMPRESS_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );
  return manipulated.uri;
}

async function ensureCameraPermission(): Promise<void> {
  const camera = await ImagePicker.requestCameraPermissionsAsync();
  if (camera.status !== 'granted') {
    throw new Error('Camera permission denied');
  }
}

async function ensureGalleryPermission(): Promise<void> {
  const library = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (library.status !== 'granted') {
    throw new Error('Photo library permission denied');
  }
}

/**
 * Mirrors Flutter `image_picker` + `ProfileService.uploadProfilePicture`.
 * Uses expo-image-picker for camera/gallery (Flutter does not use a raw camera widget).
 */
export function useCamera() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFromGallery = useCallback(async (): Promise<string> => {
    setError(null);
    await ensureGalleryPermission();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]?.uri) {
      throw new Error('No image selected');
    }
    return compressImage(result.assets[0].uri);
  }, []);

  const takePhoto = useCallback(async (): Promise<string> => {
    setError(null);
    await ensureCameraPermission();
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]?.uri) {
      throw new Error('Photo capture cancelled');
    }
    return compressImage(result.assets[0].uri);
  }, []);

  const uploadToSupabase = useCallback(async (uri: string, bucket: string, path: string): Promise<string> => {
    setIsUploading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, blob, {
        upsert: true,
        contentType: 'image/jpeg',
      });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Upload failed';
      setError(message);
      throw e;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return {
    pickFromGallery,
    takePhoto,
    uploadToSupabase,
    isUploading,
    error,
  };
}
