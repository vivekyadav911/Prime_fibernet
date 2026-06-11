import { Platform } from 'react-native';
import { useCallback, useEffect, useState } from 'react';

type UseBiometricsResult = {
  isAvailable: boolean;
  authenticate: (reason: string) => Promise<boolean>;
  error: string | null;
};

/**
 * Optional device unlock — Flutter apps do not use `local_auth`; unified app adds
 * biometric gate per AUTH-006 (migrated from existing `services/biometric.ts`).
 */
export function useBiometrics(): UseBiometricsResult {
  const [isAvailable, setIsAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsAvailable(false);
      return;
    }

    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const LocalAuthentication = require('expo-local-authentication') as typeof import('expo-local-authentication');
        const hardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setIsAvailable(hardware && enrolled);
      } catch (e) {
        setIsAvailable(false);
        setError(e instanceof Error ? e.message : 'Biometrics unavailable');
      }
    })();
  }, []);

  const authenticate = useCallback(async (reason: string): Promise<boolean> => {
    if (Platform.OS === 'web') {
      setError('Biometric authentication is not available on web');
      return false;
    }

    setError(null);
    try {
      if (!isAvailable) {
        setError('Biometric authentication is not available');
        return false;
      }
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const LocalAuthentication = require('expo-local-authentication') as typeof import('expo-local-authentication');
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
      });
      if (!result.success) {
        setError('Authentication cancelled or failed');
        return false;
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication failed');
      return false;
    }
  }, [isAvailable]);

  return { isAvailable, authenticate, error };
}
