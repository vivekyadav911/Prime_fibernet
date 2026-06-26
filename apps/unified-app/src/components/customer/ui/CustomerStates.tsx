import { StyleSheet, Text, View } from 'react-native';

import { CustomerButton } from './CustomerButton';
import { signalGlass } from '@/theme/customer/signalGlass';

type CustomerEmptyStateProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
};

export function CustomerEmptyState({
  title,
  subtitle,
  actionLabel,
  onAction,
  icon,
}: CustomerEmptyStateProps) {
  return (
    <View style={styles.wrap} accessibilityRole="text">
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <CustomerButton label={actionLabel} onPress={onAction} variant="ghost" style={styles.btn} />
      ) : null}
    </View>
  );
}

type CustomerErrorStateProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function CustomerErrorState({
  message,
  onRetry,
  retryLabel = 'Try again',
}: CustomerErrorStateProps) {
  return (
    <View style={styles.errorWrap} accessibilityRole="alert">
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      {onRetry ? (
        <CustomerButton label={retryLabel} onPress={onRetry} style={styles.btn} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: signalGlass.spacing.xxl,
    paddingHorizontal: signalGlass.spacing.lg,
  },
  icon: { fontSize: 32, marginBottom: signalGlass.spacing.md },
  title: {
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.display,
    fontSize: signalGlass.typography.displayMd.fontSize,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: signalGlass.spacing.sm,
  },
  subtitle: {
    color: signalGlass.colors.textSecondary,
    fontFamily: signalGlass.fonts.body,
    fontSize: signalGlass.typography.body.fontSize,
    textAlign: 'center',
    lineHeight: signalGlass.typography.body.lineHeight,
  },
  btn: { marginTop: signalGlass.spacing.lg },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: signalGlass.spacing.xl,
    backgroundColor: signalGlass.colors.bgSurface,
    borderRadius: signalGlass.radius.md,
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
    margin: signalGlass.spacing.lg,
  },
  errorTitle: {
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.display,
    fontSize: signalGlass.typography.displayMd.fontSize,
    fontWeight: '700',
    marginBottom: signalGlass.spacing.sm,
  },
  errorMessage: {
    color: signalGlass.colors.textSecondary,
    fontFamily: signalGlass.fonts.body,
    fontSize: signalGlass.typography.body.fontSize,
    textAlign: 'center',
    marginBottom: signalGlass.spacing.lg,
  },
});
