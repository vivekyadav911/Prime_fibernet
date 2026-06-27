/** True when running in a browser (Expo web or RN Web). */
export function isWebBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function mimeFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.csv')) return 'text/csv;charset=utf-8';
  if (lower.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  return 'application/octet-stream';
}

function extensionFromFilename(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot + 1) : '';
}

type SaveFilePickerWindow = Window & {
  showSaveFilePicker: (options: {
    suggestedName?: string;
    types?: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<FileSystemFileHandle>;
};

/**
 * Trigger a file download in the browser with a proper filename and extension.
 * Uses the File System Access API when available (works after async PDF generation).
 */
export async function downloadBlobInBrowser(blob: Blob, filename: string): Promise<void> {
  if (!isWebBrowser()) {
    throw new Error('Browser download is only available on web.');
  }

  const typedBlob =
    blob.type && blob.type !== 'application/octet-stream'
      ? blob
      : new Blob([blob], { type: mimeFromFilename(filename) });

  if ('showSaveFilePicker' in window) {
    try {
      const ext = extensionFromFilename(filename);
      const handle = await (window as SaveFilePickerWindow).showSaveFilePicker({
        suggestedName: filename,
        types: ext
          ? [
              {
                description: ext.toUpperCase(),
                accept: { [typedBlob.type]: [`.${ext}`] },
              },
            ]
          : undefined,
      });
      const writable = await handle.createWritable();
      await writable.write(typedBlob);
      await writable.close();
      return;
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return;
    }
  }

  const url = URL.createObjectURL(typedBlob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.setAttribute('download', filename);
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

/** Synchronous text download — use from a direct click handler for CSV. */
export function downloadTextInBrowser(content: string, filename: string, mimeType: string): void {
  if (!isWebBrowser()) {
    throw new Error('Browser download is only available on web.');
  }

  const blob = new Blob(['\uFEFF', content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.setAttribute('download', filename);
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
