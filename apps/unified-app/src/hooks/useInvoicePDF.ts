import { useCallback } from 'react';

import {
  useLazyGetInvoiceSignedUrlQuery,
  useGetInvoiceCompanySettingsQuery,
  useUpdateInvoicePdfPathMutation,
} from '@/services/api/adminFinanceApi';
import { INVOICES_BUCKET } from '@/utils/invoicePdf';
import { getSupabase } from '@/services/supabase';
import type { InvoiceRecord } from '@/types/invoice';
import { readUriAsArrayBuffer } from '@/utils/fileUploadBody';
import {
  buildInvoiceStoragePath,
  generateInvoicePDF,
  type InvoiceCompanySettings,
} from '@/utils/invoicePdf';
import {
  downloadStoragePdfToCache,
  normalizeStoragePath,
  prepareStoragePdfView,
  shareLocalPdf,
  type PdfViewContent,
} from '@/utils/storagePdf';

const SIGNED_URL_EXPIRY_SECONDS = 604800;

async function uploadBytesToInvoiceStorage(storagePath: string, localUri: string): Promise<void> {
  const body = await readUriAsArrayBuffer(localUri);
  if (body.byteLength < 100) {
    throw new Error('Generated PDF is empty — could not upload');
  }
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(INVOICES_BUCKET).upload(storagePath, body, {
    upsert: true,
    contentType: 'application/pdf',
  });
  if (error) throw error;
}

export function useInvoicePDF() {
  const [fetchSignedUrl] = useLazyGetInvoiceSignedUrlQuery();
  const [updatePdfPath] = useUpdateInvoicePdfPathMutation();
  const { data: companyDefaults } = useGetInvoiceCompanySettingsQuery();

  const getSignedUrl = useCallback(
    async (storagePath: string, expirySeconds = SIGNED_URL_EXPIRY_SECONDS) => {
      const normalizedPath = normalizeStoragePath(storagePath, INVOICES_BUCKET);
      return fetchSignedUrl({ storagePath: normalizedPath, expirySeconds }).unwrap();
    },
    [fetchSignedUrl],
  );

  const buildCompany = useCallback((): InvoiceCompanySettings => {
    return {
      companyName: companyDefaults?.companyName ?? 'Prime Fibernet',
      companyAddress: companyDefaults?.companyAddress ?? '',
      companyPhone: companyDefaults?.companyPhone ?? '',
      companyEmail: companyDefaults?.companyEmail ?? '',
      companyGstin: companyDefaults?.companyGstin ?? '',
      companyState: companyDefaults?.companyState ?? 'Uttar Pradesh',
    };
  }, [companyDefaults]);

  const generateAndUploadPDF = useCallback(
    async (invoice: InvoiceRecord): Promise<string> => {
      const localUri = await generateInvoicePDF({ ...invoice, company: buildCompany() });
      const storagePath = buildInvoiceStoragePath(invoice.userId, invoice.id);
      await uploadBytesToInvoiceStorage(storagePath, localUri);
      await updatePdfPath({ invoiceId: invoice.id, storagePath }).unwrap();
      return storagePath;
    },
    [buildCompany, updatePdfPath],
  );

  const prepareLocalPdfView = useCallback(
    async (storagePath: string): Promise<PdfViewContent> => {
      return prepareStoragePdfView({
        bucket: INVOICES_BUCKET,
        storagePath,
        cacheFileName: `invoice_view_${Date.now()}.pdf`,
        resolveSignedUrl: (path) => getSignedUrl(path),
      });
    },
    [getSignedUrl],
  );

  const shareFromStoragePath = useCallback(
    async (storagePath: string, title = 'Invoice', fileName = 'Invoice.pdf') => {
      const { localUri, signedUrl } = await downloadStoragePdfToCache({
        bucket: INVOICES_BUCKET,
        storagePath,
        cacheFileName: `invoice_share_${Date.now()}.pdf`,
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
