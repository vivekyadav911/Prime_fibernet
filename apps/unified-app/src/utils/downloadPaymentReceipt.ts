import { Alert, Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import type { PaymentStatus } from '@/types/payments';
import { parseSupabaseFunctionError } from '@/utils/supabaseFunctionError';

export type PaymentReceiptResult = {
  url: string | null;
  receiptNumber: string;
};

type DownloadPaymentReceiptOptions = {
  status?: PaymentStatus;
  onFallback?: (paymentId: string) => void;
};

function receiptExtension(url: string): { ext: string; mimeType: string } {
  if (/\.pdf($|\?)/i.test(url)) {
    return { ext: 'pdf', mimeType: 'application/pdf' };
  }
  return { ext: 'html', mimeType: 'text/html' };
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
      options?.onFallback?.(paymentId);
      return;
    }

    const { ext, mimeType } = receiptExtension(result.url);
    const safeName = (result.receiptNumber || paymentId).replace(/[^\w.-]+/g, '_');
    const filename = `receipt-${safeName}.${ext}`;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.open(result.url, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    if (await Sharing.isAvailableAsync()) {
      const localPath = `${FileSystem.cacheDirectory}${filename}`;
      const downloaded = await FileSystem.downloadAsync(result.url, localPath);
      if (downloaded.status !== 200) {
        throw new Error(`Download failed with status ${downloaded.status}`);
      }
      await Sharing.shareAsync(downloaded.uri, {
        mimeType,
        dialogTitle: `Receipt ${result.receiptNumber || paymentId}`,
      });
      return;
    }

    await Linking.openURL(result.url);
  } catch (error) {
    const message = await parseSupabaseFunctionError(
      error,
      'Could not generate your receipt. Please try again or contact support.',
    );
    Alert.alert('Download Failed', message);
  }
}
