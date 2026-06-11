import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { getSupabase } from '@/services/supabase';

export type OfficerDocumentType =
  | 'profile_photo'
  | 'photo_id_front'
  | 'photo_id_back'
  | 'resume'
  | 'id_proof'
  | 'address_proof';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
]);

function extensionFromMime(mime: string): string {
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'image/png') return 'png';
  return 'jpg';
}

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return response.blob();
}

async function pickOfficerDocumentWeb(): Promise<{
  uri: string;
  mimeType: string;
  name: string;
} | null> {
  const { pickFileFromBrowser } = await import('@/utils/webFilePicker');
  const file = await pickFileFromBrowser('image/jpeg,image/png,application/pdf');
  if (!file) return null;

  const mimeType = file.type || 'application/octet-stream';
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new Error('Only JPEG, PNG, and PDF files are allowed');
  }

  return {
    uri: URL.createObjectURL(file),
    mimeType,
    name: file.name,
  };
}

async function pickOfficerImageWeb(): Promise<{
  uri: string;
  mimeType: string;
  name: string;
} | null> {
  const { pickFileFromBrowser } = await import('@/utils/webFilePicker');
  const file = await pickFileFromBrowser('image/jpeg,image/png');
  if (!file) return null;

  const mimeType = file.type || 'image/jpeg';
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new Error('Only JPEG and PNG images are allowed');
  }

  return {
    uri: URL.createObjectURL(file),
    mimeType,
    name: file.name,
  };
}

export async function pickOfficerDocument(): Promise<{
  uri: string;
  mimeType: string;
  name: string;
} | null> {
  if (Platform.OS === 'web') {
    return pickOfficerDocumentWeb();
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: ['image/*', 'application/pdf'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const mimeType = asset.mimeType ?? 'application/octet-stream';
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new Error('Only JPEG, PNG, and PDF files are allowed');
  }

  return {
    uri: asset.uri,
    mimeType,
    name: asset.name,
  };
}

export async function pickOfficerImage(): Promise<{
  uri: string;
  mimeType: string;
  name: string;
} | null> {
  if (Platform.OS === 'web') {
    return pickOfficerImageWeb();
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Photo library permission denied');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]?.uri) return null;

  return {
    uri: result.assets[0].uri,
    mimeType: 'image/jpeg',
    name: 'photo.jpg',
  };
}

export async function uploadOfficerDocumentFile(
  sessionId: string,
  documentType: OfficerDocumentType,
  file: { uri: string; mimeType: string; name: string },
): Promise<string> {
  const supabase = getSupabase();
  const ext = extensionFromMime(file.mimeType);
  const path = `pending/${sessionId}/${documentType}.${ext}`;
  const blob = await uriToBlob(file.uri);

  const { error } = await supabase.storage.from('officer-documents').upload(path, blob, {
    upsert: true,
    contentType: file.mimeType,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('officer-documents').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadOfficerDocumentForOfficer(
  officerId: string,
  documentType: OfficerDocumentType,
  file: { uri: string; mimeType: string; name: string },
): Promise<string> {
  const supabase = getSupabase();
  const ext = extensionFromMime(file.mimeType);
  const path = `${officerId}/${documentType}.${ext}`;
  const blob = await uriToBlob(file.uri);

  const { error } = await supabase.storage.from('officer-documents').upload(path, blob, {
    upsert: true,
    contentType: file.mimeType,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('officer-documents').getPublicUrl(path);
  return data.publicUrl;
}
