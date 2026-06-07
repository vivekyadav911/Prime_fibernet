import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { Button, Screen, colors } from '@prime/ui';

import { verifyAdminTotp } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setRequires2FA } from '@/store/slices/authSlice';

export function TotpScreen() {
  const [code, setCode] = useState('');
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();

  const onVerify = async () => {
    if (!user) return;
    const valid = await verifyAdminTotp(code, user.id);
    if (valid) {
      dispatch(setRequires2FA(false));
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Admin two-factor authentication</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code from your authenticator app</Text>
      <TextInput
        style={styles.input}
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />
      <Button label="Verify" onPress={onVerify} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '600', color: colors.primaryNavy },
  subtitle: { color: colors.textSecondary, marginVertical: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    letterSpacing: 8,
    textAlign: 'center',
  },
});
