import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Screen } from '@prime/ui';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { LoginSchema } from '@prime/types';
import type { AppRole } from '@prime/types';
import { z } from 'zod';

import type { AuthStackParamList } from '@/types/navigation';
import { devQuickSignIn, signInWithPassword, useBiometricLogin } from '@/hooks/useAuth';
import { LoadingOverlay } from '@/components/common';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setError } from '@/store/slices/authSlice';

const DEV_ROLES: { role: AppRole; label: string; description: string }[] = [
  { role: 'customer', label: 'Customer', description: 'Plans, payments & support' },
  { role: 'officer', label: 'Officer', description: 'Field jobs, shifts & inventory' },
  { role: 'admin', label: 'Admin', description: 'Users, analytics & settings' },
];

type FormData = z.infer<typeof LoginSchema>;

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const dispatch = useAppDispatch();
  const authError = useAppSelector((s) => s.auth.error);
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState<AppRole | null>(null);
  const { biometricLogin, isAvailable: biometricsAvailable } = useBiometricLogin();
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    dispatch(setError(null));
    try {
      await signInWithPassword(data.email, data.password);
    } catch {
      dispatch(setError('Invalid email or password'));
    } finally {
      setLoading(false);
    }
  };

  const onDevSignIn = async (role: AppRole) => {
    setDevLoading(role);
    dispatch(setError(null));
    try {
      await devQuickSignIn(dispatch, role);
    } catch {
      dispatch(setError(`Could not sign in as ${role}. Try again.`));
    } finally {
      setDevLoading(null);
    }
  };

  return (
    <Screen safeAreaTop>
      <LoadingOverlay visible={loading || !!devLoading} message="Signing in…" />
      <Text style={styles.title}>Prime Fibernet</Text>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      {errors.email ? <Text style={styles.error}>{errors.email.message}</Text> : null}
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      {errors.password ? <Text style={styles.error}>{errors.password.message}</Text> : null}
      {authError ? <Text style={styles.error}>{authError}</Text> : null}
      <Button label={loading ? 'Signing in…' : 'Sign in'} onPress={handleSubmit(onSubmit)} style={styles.btn} />
      {biometricsAvailable ? (
        <Button
          label="Sign in with biometrics"
          variant="ghost"
          onPress={() => void biometricLogin()}
        />
      ) : null}
      <Button label="Create account" variant="ghost" onPress={() => navigation.navigate('Register')} />
      <Button label="Forgot password" variant="ghost" onPress={() => navigation.navigate('ForgotPassword')} />
      {__DEV__ ? (
        <View style={styles.devSection}>
          <Text style={styles.devLabel}>Quick sign in by role</Text>
          <Text style={styles.devHint}>Preview each app experience — no account setup needed yet.</Text>
          <View style={styles.devButtons}>
            {DEV_ROLES.map(({ role, label, description }) => (
              <Button
                key={role}
                label={devLoading === role ? 'Opening…' : `${label} — ${description}`}
                variant="secondary"
                onPress={() => onDevSignIn(role)}
                style={styles.devBtn}
                disabled={!!devLoading}
              />
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', color: colors.primaryNavy, marginBottom: 24, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: 8,
    backgroundColor: colors.surfaceWhite,
  },
  error: { color: colors.errorRed, marginBottom: 8 },
  btn: { marginVertical: 12 },
  devSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
  },
  devLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryNavy,
    textAlign: 'center',
    marginBottom: 4,
  },
  devHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  devButtons: { gap: spacing.xs },
  devBtn: { marginBottom: 0 },
});
