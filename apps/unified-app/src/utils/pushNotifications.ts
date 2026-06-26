import * as Device from 'expo-device';

import { isExpoGo } from '@/utils/expoRuntime';

export { isExpoGo };

export function isPushNotificationsSupported(): boolean {
  return Device.isDevice && !isExpoGo();
}
