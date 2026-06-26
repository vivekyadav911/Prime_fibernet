import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/** True when native BlurView is unavailable (Expo Go, web). */
export function isBlurUnavailable(): boolean {
  return isExpoGo() || Platform.OS === 'web';
}
