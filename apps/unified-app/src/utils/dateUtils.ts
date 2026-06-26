/** Local calendar date as YYYY-MM-DD (avoids UTC midnight drift in attendance filters). */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDateString(isoDate: string): Date {
  const [yRaw, mRaw, dRaw] = isoDate.split('-');
  const y = Number(yRaw);
  const m = Number(mRaw);
  const d = Number(dRaw);
  return new Date(y, m - 1, d);
}

export function isSameLocalDate(a: string, b: string): boolean {
  return a === b;
}

export function isTodayLocal(isoDate: string): boolean {
  return isoDate === getLocalDateString();
}

const STALE_SYNC_MS = 120_000;

export type SyncLabel = {
  label: string;
  isStale: boolean;
};

/** Relative sync label from a server/realtime timestamp. Never fakes "just now" without data. */
export function formatSyncLabel(lastSync?: string): SyncLabel {
  if (!lastSync) {
    return { label: 'Waiting for sync…', isStale: true };
  }

  const diffMs = Date.now() - new Date(lastSync).getTime();
  if (Number.isNaN(diffMs)) {
    return { label: 'Sync time unknown', isStale: true };
  }

  const isStale = diffMs > STALE_SYNC_MS;

  if (diffMs < 60_000) {
    return { label: 'Updated just now', isStale };
  }
  if (diffMs < 3_600_000) {
    const mins = Math.floor(diffMs / 60_000);
    return { label: `Updated ${mins}m ago`, isStale };
  }

  const time = new Date(lastSync).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  return { label: `Updated at ${time}`, isStale };
}
