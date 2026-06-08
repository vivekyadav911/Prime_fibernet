import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import { store } from '@/store/store';
import { enqueueToast, setNetworkStatus } from '@/store/slices/uiSlice';

const QUEUE_KEY = 'sync_queue';
const FAILED_KEY = 'sync_queue_failed';
const MAX_RETRIES = 3;

export type QueuedOperation = {
  id: string;
  operation: string;
  /** @deprecated Use operation — kept for existing executors */
  endpoint: string;
  payload: Record<string, unknown>;
  timestamp: string;
  retries: number;
};

export type MutationExecutor = (mutation: QueuedOperation) => Promise<void>;

type ConflictFieldRule = 'server-wins' | 'last-write-wins';

const FIELD_RULES: Record<string, ConflictFieldRule> = {
  status: 'server-wins',
  payment_status: 'server-wins',
  officer_id: 'server-wins',
  is_blocked: 'server-wins',
  note: 'last-write-wins',
  notes: 'last-write-wins',
  description: 'last-write-wins',
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(retryCount: number): number {
  return Math.min(1000 * 2 ** retryCount, 30_000);
}

export function resolveConflictFields(
  local: Record<string, unknown>,
  server: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...server };
  const keys = new Set([...Object.keys(local), ...Object.keys(server)]);

  keys.forEach((key) => {
    const rule = FIELD_RULES[key] ?? 'server-wins';
    if (rule === 'last-write-wins') {
      merged[key] = local[key] ?? server[key];
    }
  });

  return merged;
}

export const SyncManager = {
  queue: [] as QueuedOperation[],
  failed: [] as QueuedOperation[],
  executor: null as MutationExecutor | null,
  wasOffline: false,

  setExecutor(executor: MutationExecutor) {
    this.executor = executor;
  },

  async loadQueue() {
    const [rawQueue, rawFailed] = await Promise.all([
      AsyncStorage.getItem(QUEUE_KEY),
      AsyncStorage.getItem(FAILED_KEY),
    ]);
    this.queue = rawQueue ? (JSON.parse(rawQueue) as QueuedOperation[]) : [];
    this.failed = rawFailed ? (JSON.parse(rawFailed) as QueuedOperation[]) : [];
  },

  async persistQueue() {
    await Promise.all([
      AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue)),
      AsyncStorage.setItem(FAILED_KEY, JSON.stringify(this.failed)),
    ]);
  },

  async enqueue(input: {
    id: string;
    operation?: string;
    endpoint?: string;
    payload: Record<string, unknown>;
  }) {
    const op = input.operation ?? input.endpoint ?? 'unknown';
    const entry: QueuedOperation = {
      id: input.id,
      operation: op,
      endpoint: op,
      payload: input.payload,
      timestamp: new Date().toISOString(),
      retries: 0,
    };
    this.queue.push(entry);
    await this.persistQueue();
  },

  async replayQueue(): Promise<number> {
    if (!this.executor || this.queue.length === 0) return 0;

    const pending = [...this.queue];
    let replayed = 0;

    for (const mutation of pending) {
      if (mutation.retries > 0) {
        await sleep(backoffMs(mutation.retries));
      }

      try {
        await this.executor(mutation);
        this.queue = this.queue.filter((item) => item.id !== mutation.id);
        replayed += 1;
      } catch {
        const item = this.queue.find((entry) => entry.id === mutation.id);
        if (!item) continue;
        item.retries += 1;
        if (item.retries >= MAX_RETRIES) {
          this.queue = this.queue.filter((entry) => entry.id !== mutation.id);
          this.failed.push({ ...item, timestamp: new Date().toISOString() });
          store.dispatch(
            enqueueToast({
              id: `sync-failed-${item.id}`,
              type: 'error',
              message: `Could not sync ${item.operation}. Will retry when you reconnect.`,
            }),
          );
        }
      }
    }

    await this.persistQueue();
    return replayed;
  },

  getFailedOperations(): QueuedOperation[] {
    return [...this.failed];
  },

  getPendingCount(): number {
    return this.queue.length;
  },

  subscribe(onReplay?: (count: number) => void) {
    return NetInfo.addEventListener(async (state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      store.dispatch(setNetworkStatus(online ? 'online' : 'offline'));

      if (!online) {
        if (!this.wasOffline) {
          store.dispatch(
            enqueueToast({
              id: 'offline-banner',
              type: 'warning',
              message: 'You are offline. Changes will sync when connection returns.',
            }),
          );
        }
        this.wasOffline = true;
        return;
      }

      this.wasOffline = false;
      await this.loadQueue();
      const replayed = await this.replayQueue();
      if (replayed > 0) onReplay?.(replayed);
    });
  },
};

/** @deprecated Use QueuedOperation */
export type QueuedMutation = QueuedOperation;
