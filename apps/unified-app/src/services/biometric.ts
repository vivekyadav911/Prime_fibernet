import * as LocalAuthentication from 'expo-local-authentication';

/** AUTH-006: Optional biometric unlock after first password login */
export async function authenticateWithBiometrics(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled) return false;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock Prime Fibernet',
    fallbackLabel: 'Use password',
  });
  return result.success;
}
