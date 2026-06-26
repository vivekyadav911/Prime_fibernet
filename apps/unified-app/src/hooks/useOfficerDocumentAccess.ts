import { useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { useLazyGetOfficerDocumentSignedUrlQuery } from '@/services/api/adminOfficersApi';
import {
  downloadStorageObjectAuthenticated,
  downloadStoragePdfToCache,
  extensionFromMime,
  isImagePath,
  isPdfPath,
  normalizeStoragePath,
  prepareStoragePdfView,
  shareLocalPdf,
} from '@/utils/storagePdf';

const SIGNED_URL_EXPIRY_SECONDS = 3600;
const OFFICER_DOCUMENTS_BUCKET = 'officer-documents';

export type OfficerDocumentViewContent =
  | {
      kind: 'pdf';
      viewMode: 'file' | 'html';
      viewerHtml?: string;
      resolvedUrl: string;
      localUri: string;
    }
  | { kind: 'image'; resolvedUrl: string }
  | { kind: 'unsupported'; resolvedUrl: string };

function mimeToDataUri(mimeType: string | null | undefined, base64: string): string {
  const mime = mimeType?.trim() || 'application/octet-stream';
  return `data:${mime};base64,${base64}`;
}

export function useOfficerDocumentAccess() {
  const [fetchSignedUrl] = useLazyGetOfficerDocumentSignedUrlQuery();

  const resolveSignedUrl = useCallback(
    async (storagePath: string, expirySeconds = SIGNED_URL_EXPIRY_SECONDS) => {
      const normalizedPath = normalizeStoragePath(storagePath, OFFICER_DOCUMENTS_BUCKET);
      return fetchSignedUrl({ storagePath: normalizedPath, expirySeconds }).unwrap();
    },
    [fetchSignedUrl],
  );

  const downloadToCache = useCallback(
    async (storagePath: string, cacheFileName: string, _mimeType?: string | null) => {
      const normalizedPath = normalizeStoragePath(storagePath, OFFICER_DOCUMENTS_BUCKET);
      try {
        return await downloadStorageObjectAuthenticated(
          OFFICER_DOCUMENTS_BUCKET,
          normalizedPath,
          cacheFileName,
        );
      } catch (authError) {
        const signedUrl = await resolveSignedUrl(normalizedPath);
        if (Platform.OS === 'web') {
          const response = await fetch(signedUrl);
          if (!response.ok) {
            throw authError;
          }
          const blob = await response.blob();
          if (blob.size === 0) {
            throw authError;
          }
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result;
              if (typeof result !== 'string') {
                reject(new Error('Could not read file data'));
                return;
              }
              resolve(result.includes(',') ? result.split(',')[1] ?? '' : result);
            };
            reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
            reader.readAsDataURL(blob);
          });
          return {
            localUri: URL.createObjectURL(blob),
            base64,
            normalizedPath,
          };
        }

        const localUri = `${FileSystem.cacheDirectory}${cacheFileName.replace(/[^\w.-]+/g, '_')}`;
        const result = await FileSystem.downloadAsync(signedUrl, localUri);
        if (result.status !== 200) {
          throw authError;
        }
        return {
          localUri: result.uri,
          base64: await FileSystem.readAsStringAsync(result.uri, {
            encoding: FileSystem.EncodingType.Base64,
          }),
          normalizedPath,
        };
      }
    },
    [resolveSignedUrl],
  );

  const prepareView = useCallback(
    async (
      storagePath: string,
      mimeType?: string | null,
    ): Promise<OfficerDocumentViewContent> => {
      const normalizedPath = normalizeStoragePath(storagePath, OFFICER_DOCUMENTS_BUCKET);

      if (isPdfPath(normalizedPath, mimeType)) {
        const prepared = await prepareStoragePdfView({
          bucket: OFFICER_DOCUMENTS_BUCKET,
          storagePath: normalizedPath,
          cacheFileName: `officer_doc_${Date.now()}.pdf`,
          resolveSignedUrl: (path) => resolveSignedUrl(path),
        });

        return {
          kind: 'pdf',
          viewMode: prepared.viewMode,
          viewerHtml: prepared.viewerHtml,
          resolvedUrl: prepared.signedUrl,
          localUri: prepared.localUri,
        };
      }

      if (isImagePath(normalizedPath, mimeType)) {
        const ext = extensionFromMime(mimeType ?? 'image/jpeg');
        const cached = await downloadToCache(
          normalizedPath,
          `officer_img_${Date.now()}.${ext}`,
          mimeType,
        );
        const resolvedUrl = Platform.OS === 'web'
          ? mimeToDataUri(mimeType, cached.base64)
          : cached.localUri;
        return { kind: 'image', resolvedUrl };
      }

      const signedUrl = await resolveSignedUrl(normalizedPath);
      return { kind: 'unsupported', resolvedUrl: signedUrl };
    },
    [downloadToCache, resolveSignedUrl],
  );

  const downloadDocument = useCallback(
    async (
      storagePath: string,
      fileName: string,
      mimeType?: string | null,
    ): Promise<void> => {
      const normalizedPath = normalizeStoragePath(storagePath, OFFICER_DOCUMENTS_BUCKET);
      const safeName = fileName.replace(/[^\w.-]+/g, '_');
      const ext = extensionFromMime(mimeType ?? 'application/octet-stream');
      const downloadName = safeName.includes('.') ? safeName : `${safeName}.${ext}`;

      if (isPdfPath(normalizedPath, mimeType)) {
        const { localUri } = await downloadStoragePdfToCache({
          bucket: OFFICER_DOCUMENTS_BUCKET,
          storagePath: normalizedPath,
          cacheFileName: downloadName,
          resolveSignedUrl: (path) => resolveSignedUrl(path),
        });
        const webDownloadUrl = Platform.OS === 'web'
          ? await resolveSignedUrl(normalizedPath).catch(() => undefined)
          : undefined;
        await shareLocalPdf({
          localUri,
          title: fileName,
          fileName: downloadName,
          webDownloadUrl,
        });
        return;
      }

      const cached = await downloadToCache(normalizedPath, downloadName, mimeType);

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const href = mimeToDataUri(mimeType, cached.base64);
        const anchor = document.createElement('a');
        anchor.href = href;
        anchor.download = downloadName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        return;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(cached.localUri, {
          mimeType: mimeType ?? undefined,
          dialogTitle: fileName,
        });
      }
    },
    [downloadToCache, resolveSignedUrl],
  );

  return {
    resolveSignedUrl,
    prepareView,
    downloadDocument,
    signedUrlExpirySeconds: SIGNED_URL_EXPIRY_SECONDS,
  };
}
