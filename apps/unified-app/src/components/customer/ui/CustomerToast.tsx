import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

type CustomerToastProps = {
  title: string;
  body?: string;
  visible: boolean;
  onDismiss: () => void;
  durationMs?: number;
};

export function CustomerToast({
  title,
  body,
  visible,
  onDismiss,
  durationMs = 4000,
}: CustomerToastProps) {
  const styles = useThemedStyles(createStyles);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [visible, durationMs, onDismiss]);

  if (!visible) return null;

  return (
    <Animated.View entering={FadeInUp} exiting={FadeOutUp} style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        {body ? <Text style={styles.body} numberOfLines={2}>{body}</Text> : null}
      </View>
    </Animated.View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      top: 56,
      left: theme.spacing.lg,
      right: theme.spacing.lg,
      zIndex: 100,
    },
    card: {
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.accentPrimary,
      padding: theme.spacing.lg,
      ...theme.shadow.cardGlow,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.bodyMedium,
      fontWeight: '600',
      fontSize: 14,
    },
    body: {
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.body,
      fontSize: 13,
      marginTop: theme.spacing.xs,
    },
  });
