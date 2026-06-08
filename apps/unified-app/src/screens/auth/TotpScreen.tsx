import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Screen, colors } from '@prime/ui';

import { ErrorState } from '@/components/common';
import { useVerifyAdminTotpMutation } from '@/store/api/endpoints';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setRequires2FA } from '@/store/slices/authSlice';
import { queryErrorMessage } from '@/utils/queryError';

export function TotpScreen() {
  const [code, setCode] = useState('');
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const [verifyTotp, { isLoading, isError, error, reset }] = useVerifyAdminTotpMutation();

  const onVerify = async () => {
    if (!user) return;
    reset();
    try {
      const result = await verifyTotp({ code, userId: user.id }).unwrap();
      if (result.valid) {
        dispatch(setRequires2FA(false));
      }
    } catch {
      // isError handled below
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
        editable={!isLoading}
      />
      {isError ? (
        <View style={styles.errorWrap}>
          <ErrorState
            message={queryErrorMessage(error, 'Invalid verification code. Please try again.')}
            onRetry={reset}
          />
        </View>
      ) : null}
      <Button label={isLoading ? 'Verifying…' : 'Verify'} onPress={onVerify} disabled={isLoading || code.length < 6} />
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
  errorWrap: { marginBottom: 16, minHeight: 100 },
});
