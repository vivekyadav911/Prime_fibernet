import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { Button, Screen, colors } from '@prime/ui';
import { useAuth } from '@/lib/auth-context';

export default function ProfileScreen() {
  const { signOut } = useAuth();

  return (
    <Screen>
      <Text style={styles.title}>Officer profile</Text>
      <Text style={styles.subtitle}>Read-only profile from Supabase (M2)</Text>
      <Button
        label="Sign out"
        variant="secondary"
        onPress={() => {
          signOut();
          router.replace('/(auth)/login');
        }}
        style={styles.button}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    marginTop: 8,
    color: colors.textMuted,
  },
  button: {
    marginTop: 24,
  },
});
