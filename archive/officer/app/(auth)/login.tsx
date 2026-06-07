import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Button, Screen, colors } from '@prime/ui';
import { useAuth } from '@/lib/auth-context';

export default function LoginScreen() {
  const { signIn } = useAuth();

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Prime Fibernet Officer</Text>
      <Text style={styles.subtitle}>Email sign in (M1)</Text>
      <Button
        label="Continue (dev placeholder)"
        onPress={() => {
          signIn();
          router.replace('/(app)/(tabs)');
        }}
        style={styles.button}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  button: {
    marginTop: 32,
  },
});
