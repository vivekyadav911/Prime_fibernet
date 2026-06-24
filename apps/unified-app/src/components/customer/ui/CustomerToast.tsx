import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

import { signalGlass } from '@/theme/customer/signalGlass';

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

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 56,
    left: signalGlass.spacing.lg,
    right: signalGlass.spacing.lg,
    zIndex: 100,
  },
  card: {
    backgroundColor: signalGlass.colors.bgSurface,
    borderRadius: signalGlass.radius.md,
    borderWidth: 1,
    borderColor: signalGlass.colors.accentPrimary,
    padding: signalGlass.spacing.lg,
    ...signalGlass.shadow.cardGlow,
  },
  title: {
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.bodyMedium,
    fontWeight: '600',
    fontSize: 14,
  },
  body: {
    color: signalGlass.colors.textSecondary,
    fontFamily: signalGlass.fonts.body,
    fontSize: 13,
    marginTop: signalGlass.spacing.xs,
  },
});
