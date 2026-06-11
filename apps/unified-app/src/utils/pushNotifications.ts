import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';

export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export function isPushNotificationsSupported(): boolean {
  return Device.isDevice && !isExpoGo();
}
