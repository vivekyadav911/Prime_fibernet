import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, TextInput } from 'react-native';
import { Button, Screen, colors } from '@prime/ui';
import { z } from 'zod';

import type { AuthStackParamList } from '@/types/navigation';
import { spacing } from '@/theme/spacing';
import {
  useSendLoginOtpMutation,
  useVerifyLoginOtpMutation,
} from '@/store/api/endpoints';

const otpSchema = z.object({
  token: z.string().length(6, 'Enter the 6-digit code'),
});

type FormData = z.infer<typeof otpSchema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'OTPVerification'>;

export function OtpVerificationScreen({ route }: Props) {
  const { identifier } = route.params;
  const [sendOtp, sendState] = useSendLoginOtpMutation();
  const [verifyOtp, verifyState] = useVerifyLoginOtpMutation();
  const [message, setMessage] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { token: '' },
  });

  const onResend = async () => {
    try {
      await sendOtp({ identifier }).unwrap();
      setMessage('A new code was sent.');
    } catch {
      setMessage('Could not resend code. Try again.');
    }
  };

  const onSubmit = async (data: FormData) => {
    setMessage(null);
    try {
      await verifyOtp({ identifier, token: data.token }).unwrap();
    } catch {
      setMessage('Invalid or expired code.');
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>Code sent to {identifier}</Text>
      <Controller
        control={control}
        name="token"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="6-digit code"
            keyboardType="number-pad"
            maxLength={6}
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      {errors.token ? <Text style={styles.error}>{errors.token.message}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Button
        label={verifyState.isLoading ? 'Verifying…' : 'Verify'}
        onPress={handleSubmit(onSubmit)}
        style={styles.btn}
      />
      <Button
        label={sendState.isLoading ? 'Sending…' : 'Resend code'}
        variant="secondary"
        onPress={onResend}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600', color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 8,
    padding: 12,
    fontSize: 20,
    letterSpacing: 8,
    textAlign: 'center',
    backgroundColor: colors.surfaceWhite,
  },
  error: { color: colors.errorRed, marginTop: 8 },
  message: { color: colors.textSecondary, marginTop: 8 },
  btn: { marginTop: 16, marginBottom: 8 },
});
