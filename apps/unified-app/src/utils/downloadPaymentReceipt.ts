import { Alert, Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { PaymentStatus } from '@/types/payments';
import { parseSupabaseFunctionError } from '@/utils/supabaseFunctionError';

export type PaymentReceiptResult = {
  url: string | null;
  receiptNumber: string;
  html?: string | null;
};

type DownloadPaymentReceiptOptions = {
  status?: PaymentStatus;
  onFallback?: (paymentId: string) => void;
};

function receiptExtension(url: string): { ext: string; mimeType: string; isPdf: boolean } {
  if (/\.pdf($|\?)/i.test(url)) {
    return { ext: 'pdf', mimeType: 'application/pdf', isPdf: true };
  }
  return { ext: 'html', mimeType: 'text/html', isPdf: false };
}

async function fetchReceiptHtml(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not download receipt (HTTP ${response.status})`);
  }
  return response.text();
}

function openRenderedHtmlOnWeb(html: string): void {
  if (typeof window === 'undefined') return;
  if (!html.trim()) {
    throw new Error('Receipt file was empty.');
  }
  const popup = window.open('about:blank', '_blank');
  if (!popup) {
    throw new Error('Pop-up blocked. Allow pop-ups to view the receipt.');
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}

/** Fetch and share/open a payment receipt. Only confirmed payments should be downloaded. */
export async function downloadPaymentReceipt(
  paymentId: string,
  fetchReceipt: (id: string) => Promise<PaymentReceiptResult>,
  options?: DownloadPaymentReceiptOptions,
): Promise<void> {
  if (options?.status && options.status !== 'confirmed') {
    Alert.alert('Receipt unavailable', 'Receipt is available after payment is confirmed.');
    return;
  }

  try {
    const result = await fetchReceipt(paymentId);
    if (!result.url) {
      if (options?.onFallback) {
        options.onFallback(paymentId);
        return;
      }
      throw new Error('Receipt generated but no download link was returned.');
    }

    const { ext, mimeType, isPdf } = receiptExtension(result.url);
    const safeName = (result.receiptNumber || paymentId).replace(/[^\w.-]+/g, '_');
    const filename = `receipt-${safeName}.${ext}`;

    if (isPdf) {
      if (Platform.OS === 'web') {
        window.open(result.url, '_blank', 'noopener,noreferrer');
        return;
      }
      const localPath = `${FileSystem.cacheDirectory}${filename}`;
      const downloaded = await FileSystem.downloadAsync(result.url, localPath);
      if (downloaded.status !== 200) {
        throw new Error(`Download failed with status ${downloaded.status}`);
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloaded.uri, {
          mimeType,
          dialogTitle: `Receipt ${result.receiptNumber || paymentId}`,
        });
      } else {
        await Linking.openURL(result.url);
      }
      return;
    }

    const html =
      result.html?.trim() ||
      (await fetchReceiptHtml(result.url));

    if (Platform.OS === 'web') {
      openRenderedHtmlOnWeb(html);
      return;
    }

    const { uri: pdfUri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Receipt ${result.receiptNumber || paymentId}`,
      });
      return;
    }

    await Linking.openURL(pdfUri);
  } catch (error) {
    const message = await parseSupabaseFunctionError(
      error,
      'Could not generate your receipt. Please try again or contact support.',
    );
    Alert.alert('Download Failed', message);
  }
}
