import * as LocalAuthentication from 'expo-local-authentication';
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
    void (async () => {
      try {
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
    setError(null);
    try {
      if (!isAvailable) {
        setError('Biometric authentication is not available');
        return false;
      }
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
