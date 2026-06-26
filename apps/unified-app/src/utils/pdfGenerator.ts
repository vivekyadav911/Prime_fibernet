import * as Sharing from 'expo-sharing';

import { generatePdfFromHtml as renderHtmlToPdf } from '@/utils/htmlToPdf';

export async function generatePdfFromHtml(html: string, _filename = 'document.pdf'): Promise<string> {
  const uri = await renderHtmlToPdf(html);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }
  return uri;
}

export async function shareHtmlAsPdf(html: string): Promise<string> {
  return generatePdfFromHtml(html);
}
