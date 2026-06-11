import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@prime/ui';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type AdminEmptyStateProps = {
  title: string;
  subtitle?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function AdminEmptyState({ title, subtitle, icon = '📭', actionLabel, onAction }: AdminEmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} style={styles.btn} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.xl },
  icon: { fontSize: 48, marginBottom: spacing.sm },
  title: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  subtitle: { marginTop: spacing.xs, color: colors.textSecondary, textAlign: 'center' },
  btn: { marginTop: spacing.md, alignSelf: 'stretch' },
});
