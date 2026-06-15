import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export async function generatePdfFromHtml(html: string, filename = 'document.pdf'): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }
  return uri;
}

export async function shareHtmlAsPdf(html: string): Promise<string> {
  return generatePdfFromHtml(html);
}
