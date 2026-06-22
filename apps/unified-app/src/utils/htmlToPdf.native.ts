import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';

const MIN_PDF_BYTES = 100;

export async function generatePdfFromHtml(html: string): Promise<string> {
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    throw new Error('PDF generation failed — file was not created');
  }
  if ('size' in info && typeof info.size === 'number' && info.size < MIN_PDF_BYTES) {
    throw new Error('PDF generation failed — output file is empty');
  }

  return uri;
}
