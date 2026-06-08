import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Screen, colors } from '@prime/ui';

import { useResetPasswordMutation } from '@/store/api/endpoints';
import type { AuthStackParamList } from '@/types/navigation';

export function ForgotPasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const onSubmit = async () => {
    try {
      await resetPassword({ email }).unwrap();
      setMessage('If an account exists, a reset link was sent.');
    } catch {
      setMessage('If an account exists, a reset link was sent.');
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Reset password</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!isLoading}
      />
      {message ? <Text style={styles.info}>{message}</Text> : null}
      <View style={styles.submitRow}>
        <Button label="Send reset link" onPress={onSubmit} disabled={isLoading || !email.trim()} />
        {isLoading ? <ActivityIndicator color={colors.primaryNavy} style={styles.spinner} /> : null}
      </View>
      <Button label="Back to sign in" variant="ghost" onPress={() => navigation.navigate('Login')} disabled={isLoading} />
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
    marginBottom: 12,
  },
  info: { color: colors.textSecondary, marginBottom: 12 },
  submitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  spinner: { marginLeft: 4 },
});
