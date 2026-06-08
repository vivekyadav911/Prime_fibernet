import * as SecureStore from 'expo-secure-store';
import type { Storage } from 'redux-persist';

export const securePersistStorage: Storage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};
