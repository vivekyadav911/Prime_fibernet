import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Button } from '@prime/ui';
import { colors } from '@/theme/colors';
import { adminColors } from '@/theme/admin';
import { spacing } from '@/theme/spacing';
import type { AppRole } from '@prime/types';
import { z } from 'zod';

import type { AuthStackParamList } from '@/types/navigation';
import {
  commitAuthenticatedSession,
  fetchMyRole,
  resolveLoginEmail,
  setInteractiveLogin,
  signInWithPassword,
  signOut,
} from '@/hooks/useAuth';
import { AuthField, AuthScreen, GENERIC_LOGIN_ERROR } from '@/components/auth/AuthLayout';
import { LoadingOverlay } from '@/components/common';
import { useSendLoginOtpMutation, useTouchFullLoginMutation } from '@/store/api/endpoints';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setError } from '@/store/slices/authSlice';

const ROLE_COPY: Record<AppRole, { title: string; accent: string; article: string }> = {
  customer: { title: 'Customer sign in', accent: colors.primaryNavy, article: 'a Customer' },
  officer: { title: 'Officer sign in', accent: colors.primaryNavy, article: 'an Officer' },
  admin: { title: 'Admin sign in', accent: adminColors.primary, article: 'an Admin' },
};

const loginSchema = z.object({
  identifier: z.string().min(1, 'Required'),
  password: z.string().min(1, 'Required'),
});
type FormData = z.infer<typeof loginSchema>;

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const route = useRoute<RouteProp<AuthStackParamList, 'Login'>>();
  const selectedRole = route.params?.role;
  const isAdmin = selectedRole === 'admin';
  const copy = selectedRole ? ROLE_COPY[selectedRole] : null;

  const dispatch = useAppDispatch();
  const authError = useAppSelector((s) => s.auth.error);
  const [loading, setLoading] = useState(false);
  const [sendOtp] = useSendLoginOtpMutation();
  const [touchFullLogin] = useTouchFullLoginMutation();
  const {
    control,
    handleSubmit,
    getValues,
    setError: setFieldError,
    clearErrors,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    dispatch(setError(null));
    setInteractiveLogin(true);
    let handedOff = false;
    try {
      const email = await resolveLoginEmail(data.identifier);
      if (!email) {
        dispatch(setError(GENERIC_LOGIN_ERROR));
        return;
      }

      const result = await signInWithPassword(email, data.password);
      const sessionUser = result.session?.user;
      if (!result.session || !sessionUser) throw new Error('Session incomplete');

      const actualRole = await fetchMyRole();
      // Reject when the real (DB) role doesn't match the portal picked on Landing.
      if (!actualRole || (selectedRole && actualRole !== selectedRole)) {
        await signOut(dispatch);
        dispatch(setError(GENERIC_LOGIN_ERROR));
        return;
      }

      if (actualRole === 'admin') {
        // Password OK — hand off to the mandatory TOTP step before committing.
        // Keep the interactive lock so bootstrap can't commit at aal1.
        handedOff = true;
        navigation.navigate('AdminMfa', { role: 'admin' });
        return;
      }

      // Customer/officer: slide the 30-day window and enter the app.
      await touchFullLogin().unwrap().catch(() => undefined);
      commitAuthenticatedSession(dispatch, result.session, sessionUser, actualRole);
    } catch {
      dispatch(setError(GENERIC_LOGIN_ERROR));
    } finally {
      if (!handedOff) setInteractiveLogin(false);
      setLoading(false);
    }
  };

  // First-login claim / passwordless entry: email a login code, then verify.
  const onGetCode = async () => {
    dispatch(setError(null));
    clearErrors('identifier');
    const identifier = getValues('identifier');
    if (!identifier.trim()) {
      setFieldError('identifier', {
        type: 'manual',
        message: 'Enter your email above first, then tap "Get a login code".',
      });
      return;
    }
    const email = await resolveLoginEmail(identifier);
    // Always proceed to the OTP screen regardless of whether the account exists,
    // so this form can't be used to enumerate valid accounts.
    if (email) {
      await sendOtp({ identifier: email }).unwrap().catch(() => undefined);
    }
    navigation.navigate('OTPVerification', {
      identifier: email ?? identifier.trim(),
      mode: 'claim',
      role: selectedRole,
    });
  };

  return (
    <AuthScreen>
      <LoadingOverlay visible={loading} message="Signing in…" />
      <Text style={styles.title}>Prime Fibernet</Text>
      {copy ? <Text style={[styles.subtitle, { color: copy.accent }]}>{copy.title}</Text> : null}

      <Controller
        control={control}
        name="identifier"
        render={({ field: { onChange, value, onBlur } }) => (
          <AuthField
            label={isAdmin ? 'Email' : 'Email or username'}
            placeholder={isAdmin ? 'you@company.com' : 'Email or username'}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={isAdmin ? 'email-address' : 'default'}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.identifier?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value, onBlur } }) => (
          <AuthField
            label="Password"
            placeholder="Your password"
            secureTextEntry
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password?.message}
          />
        )}
      />
      {authError ? <Text style={styles.formError}>{authError}</Text> : null}

      <Button
        label={loading ? 'Signing in…' : 'Log in'}
        onPress={handleSubmit(onSubmit)}
        style={styles.btn}
      />

      {!isAdmin ? (
        <Pressable onPress={onGetCode} style={styles.linkRow}>
          <Text style={styles.link}>First time here? Get a login code</Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => navigation.navigate('ForgotPassword', { role: selectedRole })}
        style={styles.linkRow}
      >
        <Text style={styles.link}>Forgot password?</Text>
      </Pressable>
      {!isAdmin ? (
        <Pressable
          onPress={() => navigation.navigate('ForgotUsername', { role: selectedRole })}
          style={styles.linkRow}
        >
          <Text style={styles.link}>Forgot username?</Text>
        </Pressable>
      ) : null}

    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', color: colors.primaryNavy, marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 16, fontWeight: '600', marginBottom: spacing.lg, textAlign: 'center' },
  formError: { color: colors.errorRed, marginBottom: spacing.xs, fontSize: 14 },
  btn: { marginVertical: spacing.sm },
  linkRow: { paddingVertical: spacing.sm, alignItems: 'center' },
  link: { color: colors.primaryNavy, fontSize: 14, fontWeight: '500' },
});
