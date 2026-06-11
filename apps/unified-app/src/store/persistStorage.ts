import type { Storage } from 'redux-persist';

import { createHybridSecureStorage } from '@/services/hybridSecureStorage';

/** SecureStore only allows alphanumeric, ".", "-", and "_". redux-persist uses `persist:slice`. */
function toSecureKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_');
}

const hybridStorage = createHybridSecureStorage();

export const securePersistStorage: Storage = {
  getItem: (key) => hybridStorage.getItem(toSecureKey(key)),
  setItem: (key, value) => hybridStorage.setItem(toSecureKey(key), value),
  removeItem: (key) => hybridStorage.removeItem(toSecureKey(key)),
};
