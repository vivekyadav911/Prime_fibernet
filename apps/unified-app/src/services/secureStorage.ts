import * as SecureStore from 'expo-secure-store';
import type { SupabaseStorageAdapter } from '@prime/api-client';

const SECURE_STORE_LIMIT = 2048;

export const secureStorageAdapter: SupabaseStorageAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => {
    if (value.length > SECURE_STORE_LIMIT) {
      console.warn(`SecureStore value for ${key} exceeds ${SECURE_STORE_LIMIT} bytes`);
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};
