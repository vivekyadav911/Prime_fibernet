import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { StyleSheet, Text, TextInput } from 'react-native';
import { Button, Screen, colors } from '@prime/ui';
import { SignUpSchema } from '@prime/types';
import { z } from 'zod';

import { signUp } from '@/hooks/useAuth';
import type { AuthStackParamList } from '@/types/navigation';

type FormData = z.infer<typeof SignUpSchema>;

export function SignUpScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(SignUpSchema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await signUp(data.name, data.email, data.phone, data.password);
      setMessage('Check your email to verify your account.');
    } catch {
      setMessage('Registration failed. Please try again.');
    } finally {
      setLoading(false);
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
      {message ? <Text style={styles.info}>{message}</Text> : null}
      <Button label={loading ? 'Creating…' : 'Register'} onPress={handleSubmit(onSubmit)} />
      <Button label="Back to sign in" variant="ghost" onPress={() => navigation.goBack()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600', color: colors.primaryNavy, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.surfaceWhite,
  },
  error: { color: colors.errorRed },
  info: { color: colors.successGreen, marginVertical: 8 },
});
