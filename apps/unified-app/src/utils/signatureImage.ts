import * as FileSystem from 'expo-file-system/legacy';

import { downloadStorageObjectAuthenticated } from '@/utils/storagePdf';

const EMPLOYMENT_CONTRACTS_BUCKET = 'employment-contracts';

/** Strip data-URI prefix and return raw PNG base64. */
export function normalizeSignatureBase64(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:')) {
    const comma = trimmed.indexOf(',');
    if (comma > -1) return trimmed.slice(comma + 1);
  }
  return trimmed;
}

/** Write PNG base64 to cache and return a local file URI for expo-print. */
export async function writeSignatureBase64ToCache(
  base64Input: string,
  cacheFileName: string,
): Promise<string> {
  const base64 = normalizeSignatureBase64(base64Input);
  if (base64.length < 20) {
    throw new Error('Signature image data is empty');
  }

  const safeName = cacheFileName.replace(/[^\w.-]+/g, '_');
  const localUri = `${FileSystem.cacheDirectory}${safeName}`;
  await FileSystem.writeAsStringAsync(localUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const info = await FileSystem.getInfoAsync(localUri);
  if (!info.exists || ('size' in info && typeof info.size === 'number' && info.size === 0)) {
    throw new Error('Could not write signature image to cache');
  }

  return localUri;
}

export async function resolveSignatureImageForPdf(options: {
  storagePath: string | null;
  base64: string | null;
  cacheFileName: string;
}): Promise<string | undefined> {
  if (options.base64?.trim()) {
    try {
      return await writeSignatureBase64ToCache(options.base64, options.cacheFileName);
    } catch {
      // Fall through to storage download.
    }
  }

  if (!options.storagePath) return undefined;

  try {
    const { localUri } = await downloadStorageObjectAuthenticated(
      EMPLOYMENT_CONTRACTS_BUCKET,
      options.storagePath,
      options.cacheFileName,
    );
    return localUri;
  } catch {
    return undefined;
  }
}
