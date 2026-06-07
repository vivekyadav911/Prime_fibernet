import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { StyleSheet, Text, TextInput } from 'react-native';
import { Button, Screen, colors } from '@prime/ui';
import { LoginSchema } from '@prime/types';
import { z } from 'zod';

import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { signInWithPassword } from '@/hooks/useAuth';
import { useAppDispatch } from '@/store/hooks';
import { setError } from '@/store/slices/authSlice';

type FormData = z.infer<typeof LoginSchema>;

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
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

  return (
    <Screen>
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
      <Button label={loading ? 'Signing in…' : 'Sign in'} onPress={handleSubmit(onSubmit)} style={styles.btn} />
      <Button label="Create account" variant="ghost" onPress={() => navigation.navigate('SignUp')} />
      <Button label="Forgot password" variant="ghost" onPress={() => navigation.navigate('ForgotPassword')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', color: colors.primaryNavy, marginBottom: 24, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.surfaceWhite,
  },
  error: { color: colors.errorRed, marginBottom: 8 },
  btn: { marginVertical: 12 },
});
