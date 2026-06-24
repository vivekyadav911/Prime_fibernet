import { useCallback } from 'react';

import {
  buildPayslipStoragePath,
  PAYSLIPS_BUCKET,
  useLazyGetPayslipSignedUrlQuery,
  useUpdatePayslipPdfUrlMutation,
} from '@/services/api/payrollApi';
import { getSupabase } from '@/services/supabase';
import type { Payslip } from '@/types/payslip';
import { readUriAsArrayBuffer } from '@/utils/fileUploadBody';
import { generatePayslipPDF } from '@/utils/payslipPdf';
import {
  downloadStoragePdfToCache,
  normalizeStoragePath,
  prepareStoragePdfView,
  shareLocalPdf,
  type PdfViewContent,
} from '@/utils/storagePdf';

const SIGNED_URL_EXPIRY_SECONDS = 604800;

async function uploadBytesToPayslipStorage(
  storagePath: string,
  localUri: string,
): Promise<void> {
  const body = await readUriAsArrayBuffer(localUri);
  if (body.byteLength < 100) {
    throw new Error('Generated PDF is empty — could not upload');
  }
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(PAYSLIPS_BUCKET).upload(storagePath, body, {
    upsert: true,
    contentType: 'application/pdf',
  });
  if (error) throw error;
}

export function usePayslipPDF() {
  const [fetchSignedUrl] = useLazyGetPayslipSignedUrlQuery();
  const [updatePdfUrl] = useUpdatePayslipPdfUrlMutation();

  const getSignedUrl = useCallback(
    async (storagePath: string, expirySeconds = SIGNED_URL_EXPIRY_SECONDS) => {
      const normalizedPath = normalizeStoragePath(storagePath, PAYSLIPS_BUCKET);
      return fetchSignedUrl({ storagePath: normalizedPath, expirySeconds }).unwrap();
    },
    [fetchSignedUrl],
  );

  const generateAndUploadPDF = useCallback(
    async (payslip: Payslip): Promise<string> => {
      const localUri = await generatePayslipPDF(payslip);
      const storagePath = buildPayslipStoragePath(payslip.officerId, payslip.id);
      await uploadBytesToPayslipStorage(storagePath, localUri);
      await updatePdfUrl({ payslipId: payslip.id, storagePath }).unwrap();
      return storagePath;
    },
    [updatePdfUrl],
  );

  const prepareLocalPdfView = useCallback(
    async (storagePath: string): Promise<PdfViewContent> => {
      return prepareStoragePdfView({
        bucket: PAYSLIPS_BUCKET,
        storagePath,
        cacheFileName: `payslip_view_${Date.now()}.pdf`,
        resolveSignedUrl: (path) => getSignedUrl(path),
      });
    },
    [getSignedUrl],
  );

  const shareFromStoragePath = useCallback(
    async (storagePath: string, title = 'Payslip', fileName = 'Payslip.pdf') => {
      const { localUri, signedUrl } = await downloadStoragePdfToCache({
        bucket: PAYSLIPS_BUCKET,
        storagePath,
        cacheFileName: `payslip_share_${Date.now()}.pdf`,
        resolveSignedUrl: (path) => getSignedUrl(path),
      });
      await shareLocalPdf({
        localUri,
        title,
        fileName,
        webDownloadUrl: signedUrl.startsWith('http') ? signedUrl : undefined,
      });
    },
    [getSignedUrl],
  );

  return {
    generateAndUploadPDF,
    getSignedUrl,
    prepareLocalPdfView,
    shareFromStoragePath,
    signedUrlExpirySeconds: SIGNED_URL_EXPIRY_SECONDS,
  };
}

export type { PdfViewContent };
