import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { getSupabase } from '@/services/supabase';
import { readUriAsArrayBuffer } from '@/utils/fileUploadBody';

export const OFFICER_DOCUMENTS_BUCKET = 'officer-documents';

export type OfficerDocumentType =
  | 'profile_photo'
  | 'photo_id_front'
  | 'photo_id_back'
  | 'resume'
  | 'id_proof'
  | 'address_proof';

export type OfficerDocumentUploadResult = {
  storagePath: string;
  mimeType: string;
  fileName: string;
};

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

export function parseOfficerDocumentStoragePath(fileUrlOrPath: string): string | null {
  const trimmed = fileUrlOrPath.trim();
  if (!trimmed) return null;

  const marker = '/officer-documents/';
  const idx = trimmed.indexOf(marker);
  if (idx >= 0) {
    return decodeURIComponent(trimmed.slice(idx + marker.length).split('?')[0] ?? '');
  }

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return trimmed;
  }

  return null;
}

export function buildStandardDocumentPath(
  officerId: string,
  documentType: OfficerDocumentType,
  mimeType: string,
): string {
  const ext = extensionFromMime(mimeType);
  return `${officerId}/${documentType}.${ext}`;
}

export function buildPendingDocumentPath(
  sessionId: string,
  documentType: OfficerDocumentType,
  mimeType: string,
): string {
  const ext = extensionFromMime(mimeType);
  return `pending/${sessionId}/${documentType}.${ext}`;
}

export function buildAdditionalDocumentPath(
  officerId: string,
  mimeType: string,
  documentId?: string,
): string {
  const ext = extensionFromMime(mimeType);
  const id = documentId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${officerId}/additional/${id}.${ext}`;
}

export async function deleteOfficerDocumentFromStorage(storagePath: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(OFFICER_DOCUMENTS_BUCKET).remove([storagePath]);
  if (error) throw error;
}

async function uploadToStorage(
  path: string,
  file: { uri: string; mimeType: string },
): Promise<string> {
  const supabase = getSupabase();
  const body = await readUriAsArrayBuffer(file.uri);

  const { error } = await supabase.storage.from(OFFICER_DOCUMENTS_BUCKET).upload(path, body, {
    upsert: true,
    contentType: file.mimeType,
  });
  if (error) throw error;

  return path;
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
): Promise<OfficerDocumentUploadResult> {
  const path = buildPendingDocumentPath(sessionId, documentType, file.mimeType);
  const storagePath = await uploadToStorage(path, file);
  return { storagePath, mimeType: file.mimeType, fileName: file.name };
}

export async function uploadOfficerDocumentForOfficer(
  officerId: string,
  documentType: OfficerDocumentType,
  file: { uri: string; mimeType: string; name: string },
): Promise<OfficerDocumentUploadResult> {
  const path = buildStandardDocumentPath(officerId, documentType, file.mimeType);
  const storagePath = await uploadToStorage(path, file);
  return { storagePath, mimeType: file.mimeType, fileName: file.name };
}

export async function uploadAdditionalOfficerDocument(
  officerId: string,
  file: { uri: string; mimeType: string; name: string },
  documentId?: string,
): Promise<OfficerDocumentUploadResult> {
  const path = buildAdditionalDocumentPath(officerId, file.mimeType, documentId);
  const storagePath = await uploadToStorage(path, file);
  return { storagePath, mimeType: file.mimeType, fileName: file.name };
}
