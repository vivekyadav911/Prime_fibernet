import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CustomerButton } from './CustomerButton';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

type CustomerEmptyStateProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  icon?: string;
  illustration?: ReactNode;
};

export function CustomerEmptyState({
  title,
  subtitle,
  actionLabel,
  onAction,
  actionDisabled = false,
  icon,
  illustration,
}: CustomerEmptyStateProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.wrap} accessibilityRole="text">
      {illustration ?? (icon ? <Text style={styles.icon}>{icon}</Text> : null)}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <CustomerButton
          label={actionLabel}
          onPress={onAction}
          variant="ghost"
          disabled={actionDisabled}
          style={styles.btn}
        />
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
  const styles = useThemedStyles(createStyles);

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

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    wrap: {
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
    },
    icon: { fontSize: 32, marginBottom: theme.spacing.md },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.displayMd.fontSize,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.body.fontSize,
      textAlign: 'center',
      lineHeight: theme.typography.body.lineHeight,
    },
    btn: { marginTop: theme.spacing.lg },
    errorWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      margin: theme.spacing.lg,
    },
    errorTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.displayMd.fontSize,
      fontWeight: '700',
      marginBottom: theme.spacing.sm,
    },
    errorMessage: {
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.body.fontSize,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
  });
