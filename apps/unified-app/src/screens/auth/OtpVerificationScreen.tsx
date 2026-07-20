import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';
import { Button } from '@prime/ui';
import { z } from 'zod';

import { AuthField, AuthScreen, GENERIC_CODE_ERROR } from '@/components/auth/AuthLayout';
import {
  commitAuthenticatedSession,
  fetchLoginState,
  fetchMyRole,
  setInteractiveLogin,
  signOut,
} from '@/hooks/useAuth';
import { getSupabase } from '@/services/supabase';
import {
  useSendLoginOtpMutation,
  useTouchFullLoginMutation,
  useVerifyLoginOtpMutation,
} from '@/store/api/endpoints';
import { useAppDispatch } from '@/store/hooks';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AuthStackParamList } from '@/types/navigation';

const otpSchema = z.object({ token: z.string().length(6, 'Enter the 6-digit code') });
type FormData = z.infer<typeof otpSchema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'OTPVerification'>;

export function OtpVerificationScreen({ route }: Props) {
  const { identifier, role } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const dispatch = useAppDispatch();
  const [sendOtp, sendState] = useSendLoginOtpMutation();
  const [verifyOtp, verifyState] = useVerifyLoginOtpMutation();
  const [touchFullLogin] = useTouchFullLoginMutation();
  const [message, setMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(otpSchema), defaultValues: { token: '' } });

  const onResend = async () => {
    setMessage(null);
    try {
      await sendOtp({ identifier }).unwrap();
      setMessage('If an account exists, a new code was sent.');
    } catch {
      setMessage('If an account exists, a new code was sent.');
    }
  };

  const onSubmit = async (data: FormData) => {
    setMessage(null);
    setInteractiveLogin(true);
    let handedOff = false;
    try {
      const { session, user } = await verifyOtp({ identifier, token: data.token }).unwrap();

      const actualRole = await fetchMyRole();
      if (!actualRole || (role && actualRole !== role)) {
        await signOut(dispatch);
        setMessage(GENERIC_CODE_ERROR);
        return;
      }

      const { passwordSet } = await fetchLoginState();
      if (!passwordSet) {
        // First-login claim: they must set a password before entering the app.
        handedOff = true;
        navigation.navigate('CreatePassword', { role: actualRole });
        return;
      }

      await touchFullLogin().unwrap().catch(() => undefined);
      commitAuthenticatedSession(dispatch, session, user, actualRole);
    } catch {
      setMessage(GENERIC_CODE_ERROR);
      await getSupabase().auth.signOut({ scope: 'local' }).catch(() => undefined);
    } finally {
      if (!handedOff) setInteractiveLogin(false);
    }
  };

  return (
    <AuthScreen>
      <Text style={styles.title}>Enter your code</Text>
      <Text style={styles.subtitle}>We sent a 6-digit code to {identifier}</Text>
      <Controller
        control={control}
        name="token"
        render={({ field: { onChange, value } }) => (
          <AuthField
            label="Verification code"
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            value={value}
            onChangeText={onChange}
            style={styles.codeInput}
            error={errors.token?.message}
          />
        )}
      />
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
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.md },
  codeInput: { letterSpacing: 8, textAlign: 'center', fontSize: 22 },
  message: { color: colors.errorRed, marginTop: spacing.xs },
  btn: { marginTop: spacing.md, marginBottom: spacing.sm },
});
