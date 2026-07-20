import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';
import { Button } from '@prime/ui';
import { z } from 'zod';

import { AuthField, AuthScreen } from '@/components/auth/AuthLayout';
import { commitAuthenticatedSession, fetchMyRole } from '@/hooks/useAuth';
import { getSupabase } from '@/services/supabase';
import { useCompletePasswordSetupMutation } from '@/store/api/endpoints';
import { useAppDispatch } from '@/store/hooks';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AuthStackParamList } from '@/types/navigation';

// Mirrors the Supabase project password policy (lower + upper + digit, min 8)
// so users get inline guidance instead of a server rejection.
const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Use at least 8 characters')
      .regex(/[a-z]/, 'Include at least one lowercase letter')
      .regex(/[A-Z]/, 'Include at least one uppercase letter')
      .regex(/[0-9]/, 'Include at least one number'),
    confirm: z.string().min(1, 'Confirm your password'),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });
type FormData = z.infer<typeof schema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'CreatePassword'>;

export function CreatePasswordScreen({ route }: Props) {
  const role = route.params?.role;
  const dispatch = useAppDispatch();
  const [completeSetup, { isLoading }] = useCompletePasswordSetupMutation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { password: '', confirm: '' } });

  const onSubmit = async (data: FormData) => {
    setFormError(null);
    try {
      await completeSetup({ newPassword: data.password }).unwrap();
      const {
        data: { session },
      } = await getSupabase().auth.getSession();
      if (!session?.user) throw new Error('Session missing');
      const actualRole = role ?? (await fetchMyRole());
      if (!actualRole) throw new Error('Role missing');
      commitAuthenticatedSession(dispatch, session, session.user, actualRole);
    } catch {
      setFormError('Could not set your password. Please try again.');
    }
  };

  return (
    <AuthScreen>
      <Text style={styles.title}>Create your password</Text>
      <Text style={styles.subtitle}>Set a password you'll use to log in from now on.</Text>
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value, onBlur } }) => (
          <AuthField
            label="New password"
            placeholder="8+ chars, upper & lower case, a number"
            secureTextEntry
            autoCapitalize="none"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="confirm"
        render={({ field: { onChange, value, onBlur } }) => (
          <AuthField
            label="Confirm password"
            placeholder="Re-enter password"
            secureTextEntry
            autoCapitalize="none"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.confirm?.message}
          />
        )}
      />
      {formError ? <Text style={styles.formError}>{formError}</Text> : null}
      <Button
        label={isLoading ? 'Saving…' : 'Save and continue'}
        onPress={handleSubmit(onSubmit)}
        style={styles.btn}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.md },
  formError: { color: colors.errorRed, marginBottom: spacing.xs, fontSize: 14 },
  btn: { marginTop: spacing.md },
});
