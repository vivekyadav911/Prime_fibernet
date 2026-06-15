import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export async function shareBlob(blob: Blob, filename: string): Promise<void> {
  const base64 = await blobToBase64(blob);
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: 'base64',
  });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, { mimeType: guessMime(filename), dialogTitle: filename });
  }
}

export function auditLogsToCsv(
  rows: {
    timestamp: string;
    action: string;
    category: string | null;
    description: string | null;
    actorId: string | null;
    status: string | null;
  }[],
): string {
  const header = 'timestamp,action,category,description,actor_id,status';
  const lines = rows.map((r) =>
    [
      r.timestamp,
      r.action,
      r.category ?? '',
      (r.description ?? '').replace(/"/g, '""'),
      r.actorId ?? '',
      r.status ?? '',
    ]
      .map((v) => `"${v}"`)
      .join(','),
  );
  return [header, ...lines].join('\n');
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function guessMime(filename: string): string {
  if (filename.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  if (filename.endsWith('.csv')) {
    return 'text/csv';
  }
  return 'application/octet-stream';
}
