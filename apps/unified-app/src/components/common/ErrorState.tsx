import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@prime/ui';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? <Button label="Try again" onPress={onRetry} style={styles.button} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  icon: { fontSize: 40, marginBottom: spacing.sm },
  title: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  message: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  button: { marginTop: spacing.md, alignSelf: 'stretch' },
});
