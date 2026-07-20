import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, Text } from 'react-native';
import { Button, Screen } from '@prime/ui';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AuthStackParamList } from '@/types/navigation';

// ponytail: Phase 1 placeholder. The email-based username recovery flow
// (lookup + generic response + audit logging) is built in Phase 4.
export function ForgotUsernameScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  return (
    <Screen safeAreaTop padded>
      <Text style={styles.title}>Forgot username</Text>
      <Text style={styles.body}>
        Username recovery by email is coming soon. In the meantime, contact support and we&apos;ll
        help you retrieve your account details.
      </Text>
      <Button label="Back to sign in" variant="ghost" onPress={() => navigation.goBack()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.primaryNavy,
    marginBottom: spacing.md,
  },
  body: { fontSize: 15, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 22 },
});
