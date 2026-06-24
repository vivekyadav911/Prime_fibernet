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
  normalizeSignatureBase64,
  resolveSignatureImageForPdf,
  writeSignatureBase64ToCache,
} from '@/utils/signatureImage';
import {
  downloadStoragePdfToCache,
  normalizeStoragePath,
  prepareStoragePdfView,
  shareLocalPdf,
  type PdfViewContent,
} from '@/utils/storagePdf';

const SIGNED_URL_EXPIRY_SECONDS = 604800;
const EMPLOYMENT_CONTRACTS_BUCKET = 'employment-contracts';

async function uploadBytesToContractStorage(
  storagePath: string,
  localUri: string,
  contentType: string,
  minBytes = 100,
): Promise<void> {
  const body = await readUriAsArrayBuffer(localUri);
  if (body.byteLength < minBytes) {
    throw new Error('Generated file is empty — could not be uploaded. Try again.');
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
    ): Promise<{ storagePath: string; signatureBase64: string }> => {
      const storagePath = buildContractSignaturePath(officerId, contractId, role);
      const signatureBase64 = normalizeSignatureBase64(base64Png);
      const localUri = await writeSignatureBase64ToCache(
        signatureBase64,
        `signature_upload_${role}_${Date.now()}.png`,
      );
      await uploadBytesToContractStorage(storagePath, localUri, 'image/png', 20);
      return { storagePath, signatureBase64 };
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

  const loadSignatureImages = useCallback(
    async (
      contract: EmploymentContract,
      freshSignatures?: Partial<{ employee: string; employer: string }>,
    ) => {
      const [employee, employer] = await Promise.all([
        freshSignatures?.employee
          ? writeSignatureBase64ToCache(
              freshSignatures.employee,
              `contract_sig_employee_${contract.id}_${Date.now()}.png`,
            ).catch(() => undefined)
          : resolveSignatureImageForPdf({
              storagePath: contract.employeeSignaturePath,
              base64: contract.employeeSignatureBase64,
              cacheFileName: `contract_sig_employee_${contract.id}.png`,
            }),
        freshSignatures?.employer
          ? writeSignatureBase64ToCache(
              freshSignatures.employer,
              `contract_sig_employer_${contract.id}_${Date.now()}.png`,
            ).catch(() => undefined)
          : resolveSignatureImageForPdf({
              storagePath: contract.employerSignaturePath,
              base64: contract.employerSignatureBase64,
              cacheFileName: `contract_sig_employer_${contract.id}.png`,
            }),
      ]);
      return { employee, employer };
    },
    [],
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
    loadSignatureImages,
    shareContract,
    shareFromStoragePath,
    copySignedLink,
    signedUrlExpirySeconds: SIGNED_URL_EXPIRY_SECONDS,
  };
}

export type { PdfViewContent };
