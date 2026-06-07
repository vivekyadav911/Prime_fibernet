import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export type PendingOperation = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  execute: () => Promise<void>;
};

const QUEUE_KEY = 'sync_queue';

export const SyncManager = {
  queue: [] as PendingOperation[],

  async loadQueue() {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (raw) {
      this.queue = JSON.parse(raw) as PendingOperation[];
    }
  },

  async enqueue(operation: Omit<PendingOperation, 'execute'> & { execute: () => Promise<void> }) {
    this.queue.push(operation);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue.map(({ execute: _, ...rest }) => rest)));
  },

  subscribeReplay(onReplay: (count: number) => void) {
    return NetInfo.addEventListener(async (state) => {
      if (state.isConnected && this.queue.length > 0) {
        const pending = [...this.queue];
        for (const op of pending) {
          try {
            await op.execute();
            this.queue = this.queue.filter((q) => q.id !== op.id);
          } catch {
            // keep in queue
          }
        }
        await AsyncStorage.setItem(
          QUEUE_KEY,
          JSON.stringify(this.queue.map(({ execute: _, ...rest }) => rest)),
        );
        onReplay(pending.length);
      }
    });
  },
};
