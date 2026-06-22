import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

/** Read a local or remote URI into an ArrayBuffer for Supabase Storage upload. */
export async function readUriAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web' || uri.startsWith('blob:') || uri.startsWith('http://') || uri.startsWith('https://')) {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Could not read file (HTTP ${response.status})`);
    }
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      throw new Error('Selected file is empty');
    }
    return buffer;
  }

  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    throw new Error('Selected file could not be accessed');
  }
  if ('size' in info && typeof info.size === 'number' && info.size === 0) {
    throw new Error('Selected file is empty');
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (!base64 || base64.length < 16) {
    throw new Error('Selected file is empty or could not be read');
  }

  return base64ToArrayBuffer(base64);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  if (bytes.byteLength === 0) {
    throw new Error('Selected file is empty');
  }
  return bytes.buffer;
}

export async function readUriAsBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web' || uri.startsWith('blob:') || uri.startsWith('http://') || uri.startsWith('https://')) {
    const buffer = await readUriAsArrayBuffer(uri);
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (!base64 || base64.length < 16) {
    throw new Error('Selected file is empty or could not be read');
  }
  return base64;
}
