import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Screen } from '@prime/ui';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { SignUpSchema } from '@prime/types';
import { z } from 'zod';

import { ErrorState } from '@/components/common';
import { useSignUpMutation } from '@/store/api/endpoints';
import type { AuthStackParamList } from '@/types/navigation';
import { queryErrorMessage } from '@/utils/queryError';

type FormData = z.infer<typeof SignUpSchema>;

export function SignUpScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [signUp, { isLoading, isError, error, reset }] = useSignUpMutation();
  const [message, setMessage] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(SignUpSchema),
  });

  const onSubmit = async (data: FormData) => {
    reset();
    setMessage(null);
    try {
      await signUp({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
      }).unwrap();
      setMessage('Check your email to verify your account.');
    } catch {
      // isError surfaces via ErrorState below
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Create account</Text>
      {(['name', 'email', 'phone', 'password', 'confirmPassword'] as const).map((field) => (
        <Controller
          key={field}
          control={control}
          name={field}
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              placeholder={field}
              secureTextEntry={field.includes('password')}
              autoCapitalize={field === 'email' ? 'none' : 'words'}
              value={value}
              onChangeText={onChange}
            />
          )}
        />
      ))}
      {Object.values(errors).map((e, i) =>
        e?.message ? (
          <Text key={i} style={styles.error}>
            {e.message}
          </Text>
        ) : null,
      )}
      {isError ? (
        <View style={styles.formError}>
          <ErrorState message={queryErrorMessage(error, 'Registration failed. Please try again.')} onRetry={reset} />
        </View>
      ) : null}
      {message ? <Text style={styles.info}>{message}</Text> : null}
      <Button label={isLoading ? 'Creating…' : 'Register'} onPress={handleSubmit(onSubmit)} disabled={isLoading} />
      <Button label="Back to sign in" variant="ghost" onPress={() => navigation.goBack()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600', color: colors.primaryNavy, marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: 8,
    backgroundColor: colors.surfaceWhite,
  },
  error: { color: colors.errorRed },
  formError: { marginVertical: 8, minHeight: 120 },
  info: { color: colors.successGreen, marginVertical: 8 },
});
