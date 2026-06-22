import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { getSupabase } from '@/services/supabase';

export type PdfViewMode = 'file' | 'html';

export type PdfViewContent = {
  localUri: string;
  signedUrl: string;
  viewMode: PdfViewMode;
  viewerHtml?: string;
};

export type DownloadStoragePdfOptions = {
  bucket: string;
  storagePath: string;
  resolveSignedUrl: (normalizedPath: string) => Promise<string>;
  cacheFileName: string;
};

export type ShareLocalPdfOptions = {
  localUri: string;
  title: string;
  fileName: string;
  webDownloadUrl?: string;
};

/** WebView props shared by in-app PDF viewers (PDF.js requires JS). */
export const PDF_WEBVIEW_PROPS = {
  originWhitelist: ['*'] as string[],
  javaScriptEnabled: true,
  domStorageEnabled: true,
  allowFileAccess: true,
  allowUniversalAccessFromFileURLs: true,
  mixedContentMode: 'always' as const,
  scalesPageToFit: true,
  startInLoadingState: true,
};

function escapeJsString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/** Legacy base64 iframe embed — kept for small assets only. */
export function buildPdfViewerHtml(base64: string): string {
  if (!base64) {
    throw new Error('PDF data is empty');
  }
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0" />
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #525659; }
    embed { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <embed src="data:application/pdf;base64,${base64}" type="application/pdf" width="100%" height="100%" />
</body>
</html>`;
}

/**
 * Renders a PDF inside WebView using Mozilla PDF.js (works on iOS/Android/Web).
 * Loads the PDF from a signed HTTPS URL — avoids file:// and empty base64 issues.
 */
export function buildPdfJsViewerHtml(pdfUrl: string): string {
  const safeUrl = escapeJsString(pdfUrl);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=4.0, user-scalable=yes" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"><\/script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; min-height: 100%; background: #525659; font-family: -apple-system, sans-serif; }
    #status { color: #fff; padding: 24px 16px; text-align: center; font-size: 15px; }
    #status.error { color: #ffb4b4; }
    #pages { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 12px 8px 24px; }
    canvas { max-width: 100%; height: auto !important; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.35); }
  </style>
</head>
<body>
  <div id="status">Loading PDF…</div>
  <div id="pages"></div>
  <script>
    (function () {
      var pdfUrl = '${safeUrl}';
      var statusEl = document.getElementById('status');
      var pagesEl = document.getElementById('pages');
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      pdfjsLib.getDocument({ url: pdfUrl, withCredentials: false }).promise
        .then(function (pdf) {
          statusEl.style.display = 'none';
          var chain = Promise.resolve();
          for (var pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            (function (num) {
              chain = chain.then(function () {
                return pdf.getPage(num).then(function (page) {
                  var baseViewport = page.getViewport({ scale: 1 });
                  var scale = Math.min((window.innerWidth - 16) / baseViewport.width, 2);
                  var viewport = page.getViewport({ scale: scale });
                  var canvas = document.createElement('canvas');
                  canvas.width = viewport.width;
                  canvas.height = viewport.height;
                  pagesEl.appendChild(canvas);
                  return page.render({
                    canvasContext: canvas.getContext('2d'),
                    viewport: viewport
                  }).promise;
                });
              });
            })(pageNum);
          }
          return chain;
        })
        .catch(function (err) {
          statusEl.textContent = 'Could not display PDF: ' + (err && err.message ? err.message : 'Unknown error');
          statusEl.className = 'error';
        });
    })();
  <\/script>
</body>
</html>`;
}

/** Strip full Supabase URLs down to the object path inside a bucket. */
export function normalizeStoragePath(value: string, bucket: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return trimmed.replace(/^\/+/, '');
  }

  try {
    const url = new URL(trimmed);
    const pathname = decodeURIComponent(url.pathname);
    const bucketMarker = `/${bucket}/`;
    const markerIndex = pathname.indexOf(bucketMarker);
    if (markerIndex >= 0) {
      return pathname.slice(markerIndex + bucketMarker.length);
    }
    const objectMatch = pathname.match(/\/object\/(?:sign|public|authenticated)\/[^/]+\/(.+)$/);
    if (objectMatch?.[1]) {
      return objectMatch[1];
    }
  } catch {
    // fall through
  }

  return trimmed.replace(/^\/+/, '');
}

function ensurePdfFileName(fileName: string): string {
  const safe = fileName.replace(/[^\w.-]+/g, '_');
  return safe.toLowerCase().endsWith('.pdf') ? safe : `${safe}.pdf`;
}

function downloadError(_storagePath: string, message: string): Error {
  return new Error(message);
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Could not read file data'));
        return;
      }
      const base64 = result.includes(',') ? result.split(',')[1] ?? '' : result;
      if (!base64) {
        reject(new Error('File data is empty'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(blob);
  });
}

/** Download via authenticated Supabase client (uses session JWT + RLS). */
export async function downloadStorageObjectAuthenticated(
  bucket: string,
  storagePath: string,
  cacheFileName: string,
): Promise<{ localUri: string; base64: string; normalizedPath: string }> {
  const normalizedPath = normalizeStoragePath(storagePath, bucket);
  if (!normalizedPath) {
    throw downloadError(storagePath, 'Invalid storage path');
  }

  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw downloadError(normalizedPath, 'Not signed in — log out and sign in again with admin credentials');
  }

  const { data, error } = await supabase.storage.from(bucket).download(normalizedPath);
  if (error) {
    throw downloadError(normalizedPath, error.message);
  }
  if (!data) {
    throw downloadError(normalizedPath, 'Download returned empty file');
  }
  if (data.size === 0) {
    throw downloadError(
      normalizedPath,
      'This document is empty on the server — tap Replace (✎) to re-upload it',
    );
  }

  const base64 = await blobToBase64(data);
  const safeName = cacheFileName.replace(/[^\w.-]+/g, '_');
  const localUri = `${FileSystem.cacheDirectory}${safeName}`;
  await FileSystem.writeAsStringAsync(localUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const info = await FileSystem.getInfoAsync(localUri);
  if (!info.exists || ('size' in info && typeof info.size === 'number' && info.size === 0)) {
    throw downloadError(normalizedPath, 'Cached file is empty');
  }

  return { localUri, base64, normalizedPath };
}

export async function readLocalPdfBase64(localUri: string): Promise<string> {
  const info = await FileSystem.getInfoAsync(localUri);
  if (!info.exists) {
    throw new Error('PDF file not found');
  }
  if ('size' in info && typeof info.size === 'number' && info.size === 0) {
    throw new Error('PDF file is empty');
  }

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (!base64 || base64.length < 50) {
    throw new Error('Could not read PDF content');
  }
  return base64;
}

export async function downloadStoragePdfToCache(
  options: DownloadStoragePdfOptions,
): Promise<{ localUri: string; signedUrl: string; normalizedPath: string }> {
  const normalizedPath = normalizeStoragePath(options.storagePath, options.bucket);
  if (!normalizedPath) {
    throw downloadError(options.storagePath, 'Invalid storage path');
  }

  const cacheFileName = ensurePdfFileName(options.cacheFileName);

  try {
    const auth = await downloadStorageObjectAuthenticated(
      options.bucket,
      normalizedPath,
      cacheFileName,
    );
    let httpSignedUrl = auth.localUri;
    try {
      httpSignedUrl = await options.resolveSignedUrl(normalizedPath);
    } catch {
      // Share/view still works from cached local file.
    }
    return { localUri: auth.localUri, signedUrl: httpSignedUrl, normalizedPath: auth.normalizedPath };
  } catch (authError) {
    // Fall back to signed URL when authenticated download is blocked.
    if (authError instanceof Error && authError.message.includes('empty on the server')) {
      throw authError;
    }
  }

  const signedUrl = await options.resolveSignedUrl(normalizedPath);
  const localUri = `${FileSystem.cacheDirectory}${cacheFileName}`;

  const result = await FileSystem.downloadAsync(signedUrl, localUri);
  if (result.status !== 200) {
    throw downloadError(
      normalizedPath,
      `Download failed with status ${result.status}`,
    );
  }

  const info = await FileSystem.getInfoAsync(result.uri);
  if (!info.exists || ('size' in info && typeof info.size === 'number' && info.size === 0)) {
    throw downloadError(
      normalizedPath,
      'Downloaded PDF file is empty — tap Replace (✎) to re-upload the document',
    );
  }

  return { localUri: result.uri, signedUrl, normalizedPath };
}

export function preparePdfViewContent(
  signedUrl: string,
  _localUri: string,
  base64?: string,
): Pick<PdfViewContent, 'viewMode' | 'viewerHtml'> {
  const isHttpUrl = signedUrl.startsWith('http://') || signedUrl.startsWith('https://');

  if (Platform.OS === 'web') {
    if (isHttpUrl) {
      return { viewMode: 'html', viewerHtml: buildPdfJsViewerHtml(signedUrl) };
    }
    if (base64) {
      return { viewMode: 'html', viewerHtml: buildPdfViewerHtml(base64) };
    }
    throw new Error('Could not prepare PDF viewer — file may be empty or inaccessible');
  }

  // iOS WKWebView renders local PDF files reliably.
  if (Platform.OS === 'ios') {
    return { viewMode: 'file' };
  }

  // Android: embed base64 when available; otherwise try file URI.
  if (base64) {
    return { viewMode: 'html', viewerHtml: buildPdfViewerHtml(base64) };
  }

  return { viewMode: 'file' };
}

export async function prepareStoragePdfView(
  options: DownloadStoragePdfOptions,
): Promise<PdfViewContent> {
  const { localUri, signedUrl, normalizedPath } = await downloadStoragePdfToCache(options);
  let base64: string | undefined;
  try {
    base64 = await readLocalPdfBase64(localUri);
  } catch {
    base64 = undefined;
  }

  let httpUrl = signedUrl;
  if (!httpUrl.startsWith('http')) {
    try {
      httpUrl = await options.resolveSignedUrl(normalizedPath);
    } catch {
      httpUrl = signedUrl;
    }
  }

  const view = preparePdfViewContent(httpUrl, localUri, base64);
  return {
    localUri,
    signedUrl,
    viewMode: view.viewMode,
    viewerHtml: view.viewerHtml,
  };
}

export async function shareLocalPdf(options: ShareLocalPdfOptions): Promise<void> {
  const fileName = ensurePdfFileName(options.fileName);

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const href = options.webDownloadUrl ?? options.localUri;
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = fileName;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return;
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(options.localUri, {
      mimeType: 'application/pdf',
      dialogTitle: options.title,
      UTI: 'com.adobe.pdf',
    });
  }
}

export function isPdfPath(storagePath: string, mimeType?: string | null): boolean {
  if (mimeType?.includes('pdf')) return true;
  return storagePath.toLowerCase().endsWith('.pdf');
}

export function isImagePath(storagePath: string, mimeType?: string | null): boolean {
  if (mimeType?.startsWith('image/')) return true;
  const lower = storagePath.toLowerCase();
  return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png');
}

export function extensionFromMime(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('png')) return 'png';
  return 'jpg';
}
