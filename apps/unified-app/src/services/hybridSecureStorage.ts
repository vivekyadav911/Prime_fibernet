import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SECURE_STORE_LIMIT = 2048;
const LARGE_VALUE_PREFIX = 'hybrid-large:';
const LARGE_FLAG_SUFFIX = '__hybrid_large';

function largeFlagKey(key: string): string {
  return `${key}${LARGE_FLAG_SUFFIX}`;
}

function largeValueKey(key: string): string {
  return `${LARGE_VALUE_PREFIX}${key}`;
}

export type HybridStorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

/** Web-only storage backed by AsyncStorage (localStorage under the hood). */
function createWebStorage(): HybridStorageAdapter {
  return {
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    removeItem: (key) => AsyncStorage.removeItem(key),
  };
}

/** Uses SecureStore for small values; AsyncStorage when payloads exceed the 2048-byte limit. */
function createNativeHybridStorage(): HybridStorageAdapter {
  return {
    getItem: async (key) => {
      const usesLargeStorage = await AsyncStorage.getItem(largeFlagKey(key));
      if (usesLargeStorage === '1') {
        return AsyncStorage.getItem(largeValueKey(key));
      }

      const secureValue = await SecureStore.getItemAsync(key);
      if (secureValue && secureValue.length > SECURE_STORE_LIMIT) {
        await AsyncStorage.multiSet([
          [largeFlagKey(key), '1'],
          [largeValueKey(key), secureValue],
        ]);
        await SecureStore.deleteItemAsync(key).catch(() => undefined);
        return secureValue;
      }

      return secureValue;
    },
    setItem: async (key, value) => {
      if (value.length > SECURE_STORE_LIMIT) {
        await SecureStore.deleteItemAsync(key).catch(() => undefined);
        await AsyncStorage.multiSet([
          [largeFlagKey(key), '1'],
          [largeValueKey(key), value],
        ]);
        return;
      }

      await AsyncStorage.multiRemove([largeFlagKey(key), largeValueKey(key)]);
      await SecureStore.setItemAsync(key, value);
    },
    removeItem: async (key) => {
      await AsyncStorage.multiRemove([largeFlagKey(key), largeValueKey(key)]);
      await SecureStore.deleteItemAsync(key).catch(() => undefined);
    },
  };
}

export function createHybridSecureStorage(): HybridStorageAdapter {
  if (Platform.OS === 'web') {
    return createWebStorage();
  }
  return createNativeHybridStorage();
}
