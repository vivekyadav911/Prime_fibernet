import { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@prime/ui';

import { OfficerScreenWrapper } from '@/components/officer';
import { signInWithPassword } from '@/hooks/useAuth';
import { useChangePasswordMutation } from '@/services/api/authApi';
import { useAppSelector } from '@/store/hooks';
import type { OfficerProfileStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<OfficerProfileStackParamList, 'ChangePassword'>;

export function OfficerChangePasswordScreen({ navigation }: Props) {
  const user = useAppSelector((s) => s.auth.user);
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(async () => {
    setError(null);
    if (next !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (next.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    try {
      if (!user?.email) throw new Error('Email not found');
      await signInWithPassword(user.email, current);
      await changePassword({ newPassword: next }).unwrap();
      navigation.goBack();
    } catch (e) {
      setError(queryErrorMessage(e));
    }
  }, [changePassword, confirm, current, navigation, next]);

  return (
    <OfficerScreenWrapper>
      <Text style={styles.label}>CURRENT PASSWORD</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        value={current}
        onChangeText={setCurrent}
        autoCapitalize="none"
      />

      <Text style={styles.label}>NEW PASSWORD</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        value={next}
        onChangeText={setNext}
        autoCapitalize="none"
      />

      <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
        autoCapitalize="none"
      />

      {next && confirm && next === confirm ? (
        <Text style={styles.ok}>✅ Passwords match</Text>
      ) : null}
      {error ? <Text style={styles.err}>{error}</Text> : null}

      <Button
        label={isLoading ? 'Updating…' : 'Update Password'}
        onPress={() => void onSubmit()}
        disabled={isLoading || !user?.email}
        style={styles.cta}
      />
    </OfficerScreenWrapper>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    color: colors.textPrimary,
    minHeight: 48,
  },
  ok: { color: colors.emerald, marginTop: spacing.sm },
  err: { color: colors.errorRed, marginTop: spacing.sm },
  cta: { marginTop: spacing.lg, minHeight: 48 },
});
