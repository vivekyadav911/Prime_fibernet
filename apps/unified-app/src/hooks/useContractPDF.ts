import { useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';

import {
  buildContractStoragePath,
  buildContractSignaturePath,
  useLazyGetContractSignedUrlQuery,
} from '@/services/api/employmentContractsApi';
import { getSupabase } from '@/services/supabase';
import type { CompanyDefaults, ContractSignerRole, EmploymentContract } from '@/types/contract';
import { generateContractPDF } from '@/utils/employmentContractPdf';
import { readUriAsArrayBuffer } from '@/utils/fileUploadBody';
import {
  downloadStoragePdfToCache,
  normalizeStoragePath,
  prepareStoragePdfView,
  readLocalPdfBase64,
  shareLocalPdf,
  type PdfViewContent,
} from '@/utils/storagePdf';

const SIGNED_URL_EXPIRY_SECONDS = 604800;
const EMPLOYMENT_CONTRACTS_BUCKET = 'employment-contracts';

async function uploadBytesToContractStorage(
  storagePath: string,
  localUri: string,
  contentType: string,
): Promise<void> {
  const body = await readUriAsArrayBuffer(localUri);
  if (body.byteLength < 100) {
    throw new Error('Generated file is empty — PDF could not be created. Try again.');
  }

  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from(EMPLOYMENT_CONTRACTS_BUCKET)
    .upload(storagePath, body, {
      upsert: true,
      contentType,
    });
  if (error) throw error;
}

export function useContractPDF() {
  const [fetchSignedUrl] = useLazyGetContractSignedUrlQuery();

  const generatePDF = useCallback(
    async (
      contract: EmploymentContract,
      companyDefaults: CompanyDefaults | null,
      signatureImages?: { employee?: string; employer?: string },
    ) => {
      return generateContractPDF(contract, companyDefaults, signatureImages);
    },
    [],
  );

  const uploadToStorage = useCallback(
    async (
      localPath: string,
      officerId: string,
      contractId: string,
      version: number,
    ): Promise<string> => {
      const storagePath = buildContractStoragePath(officerId, contractId, version);
      await uploadBytesToContractStorage(storagePath, localPath, 'application/pdf');
      return storagePath;
    },
    [],
  );

  const uploadSignature = useCallback(
    async (
      contractId: string,
      officerId: string,
      role: ContractSignerRole,
      base64Png: string,
    ): Promise<string> => {
      const storagePath = buildContractSignaturePath(officerId, contractId, role);
      const clean = base64Png.replace(/^data:image\/png;base64,/, '');
      const localUri = `${FileSystem.cacheDirectory}signature_${role}_${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(localUri, clean, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await uploadBytesToContractStorage(storagePath, localUri, 'image/png');
      return storagePath;
    },
    [],
  );

  const getSignedUrl = useCallback(
    async (storagePath: string, expirySeconds = SIGNED_URL_EXPIRY_SECONDS) => {
      const normalizedPath = normalizeStoragePath(storagePath, EMPLOYMENT_CONTRACTS_BUCKET);
      const result = await fetchSignedUrl({ storagePath: normalizedPath, expirySeconds }).unwrap();
      return result;
    },
    [fetchSignedUrl],
  );

  const prepareLocalPdfView = useCallback(
    async (storagePath: string): Promise<PdfViewContent> => {
      return prepareStoragePdfView({
        bucket: EMPLOYMENT_CONTRACTS_BUCKET,
        storagePath,
        cacheFileName: `employment_contract_view_${Date.now()}.pdf`,
        resolveSignedUrl: (path) => getSignedUrl(path),
      });
    },
    [getSignedUrl],
  );

  const readSignatureAsDataUri = useCallback(
    async (storagePath: string | null) => {
      if (!storagePath) return undefined;
      const normalizedPath = normalizeStoragePath(storagePath, EMPLOYMENT_CONTRACTS_BUCKET);
      const signedUrl = await getSignedUrl(normalizedPath, 3600);
      const localUri = `${FileSystem.cacheDirectory}sig_${Date.now()}.png`;
      const result = await FileSystem.downloadAsync(signedUrl, localUri);
      if (result.status !== 200) {
        throw new Error(`Could not download signature (path: ${normalizedPath})`);
      }
      const base64 = await readLocalPdfBase64(localUri);
      return `data:image/png;base64,${base64}`;
    },
    [getSignedUrl],
  );

  const shareContract = useCallback(
    async (localPath: string, title = 'Employment Contract', webDownloadUrl?: string) => {
      await shareLocalPdf({
        localUri: localPath,
        title,
        fileName: 'Employment_Contract.pdf',
        webDownloadUrl,
      });
    },
    [],
  );

  const shareFromStoragePath = useCallback(
    async (storagePath: string, title = 'Employment Contract') => {
      const { localUri, signedUrl } = await downloadStoragePdfToCache({
        bucket: EMPLOYMENT_CONTRACTS_BUCKET,
        storagePath,
        cacheFileName: `Employment_Contract_${Date.now()}.pdf`,
        resolveSignedUrl: (path) => getSignedUrl(path),
      });
      await shareContract(localUri, title, signedUrl.startsWith('http') ? signedUrl : undefined);
    },
    [getSignedUrl, shareContract],
  );

  const copySignedLink = useCallback(
    async (storagePath: string) => {
      const signedUrl = await getSignedUrl(storagePath);
      await Clipboard.setStringAsync(signedUrl);
      return signedUrl;
    },
    [getSignedUrl],
  );

  return {
    generatePDF,
    uploadToStorage,
    uploadSignature,
    getSignedUrl,
    prepareLocalPdfView,
    readSignatureAsDataUri,
    shareContract,
    shareFromStoragePath,
    copySignedLink,
    signedUrlExpirySeconds: SIGNED_URL_EXPIRY_SECONDS,
  };
}

export type { PdfViewContent };
