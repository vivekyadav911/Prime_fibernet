import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/customer/ui';
import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

type ConnectionStatus = 'active' | 'suspended' | 'expired';

type SignalHeroProps = {
  speedMbps: number;
  customerName: string;
  accountId: string;
  connectionStatus: ConnectionStatus;
  unreadCount: number;
  onNotificationsPress: () => void;
};

function PulseRing({ delay, size }: { delay: number; size: number }) {
  const styles = useThemedStyles(createPulseRingStyles);
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(reduceMotion ? 0.35 : 0.6);

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      opacity.value = 0.35;
      return;
    }
    scale.value = withDelay(
      delay,
      withRepeat(withTiming(1.4, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, false),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, false),
    );
  }, [delay, opacity, reduceMotion, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    />
  );
}

export function SignalHero({
  speedMbps,
  customerName,
  accountId,
  connectionStatus,
  unreadCount,
  onNotificationsPress,
}: SignalHeroProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { theme } = useCustomerTheme();
  const styles = useThemedStyles(createStyles);
  const meterSize = Math.min(120, Math.max(96, width * 0.28));

  const statusColors: Record<ConnectionStatus, string> = {
    active: theme.colors.accentSuccess,
    suspended: theme.colors.accentWarning,
    expired: theme.colors.accentDanger,
  };

  return (
    <GlassCard glow padded={false} style={styles.card}>
      <LinearGradient
        colors={[theme.gradients.hero[0], theme.gradients.hero[1]]}
        style={[styles.gradient, { paddingTop: insets.top + theme.spacing.lg }]}
      >
        <View style={styles.topRow}>
          <Text style={styles.brand}>Prime Fibernet</Text>
          <Pressable
            accessibilityLabel="Notifications"
            onPress={onNotificationsPress}
            style={styles.bell}
            hitSlop={8}
          >
            <Ionicons name="notifications-outline" size={24} color={theme.colors.textPrimary} />
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={[styles.meterWrap, { height: meterSize + 40 }]}>
          <PulseRing delay={0} size={meterSize} />
          <PulseRing delay={400} size={meterSize} />
          <PulseRing delay={800} size={meterSize} />
          <View
            style={[
              styles.meter,
              { width: meterSize, height: meterSize, borderRadius: meterSize / 2 },
            ]}
          >
            <Text style={[styles.speed, { fontSize: meterSize * 0.27 }]}>{speedMbps}</Text>
            <Text style={styles.unit}>Mbps</Text>
          </View>
        </View>

        <Text style={styles.name} numberOfLines={2}>
          {customerName}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.dot, { backgroundColor: statusColors[connectionStatus] }]} />
          <Text style={styles.meta} numberOfLines={1}>
            {accountId} · {connectionStatus.toUpperCase()}
          </Text>
        </View>
      </LinearGradient>
    </GlassCard>
  );
}

const createPulseRingStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    ring: {
      position: 'absolute',
      borderWidth: 2,
      borderColor: theme.colors.accentPrimary,
    },
  });

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    card: { marginBottom: theme.spacing.lg, marginHorizontal: -theme.spacing.lg },
    gradient: {
      padding: theme.spacing.xl,
      paddingTop: theme.spacing.xl,
      borderRadius: theme.radius.md,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    brand: {
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.bodyMedium,
      fontSize: 13,
      letterSpacing: 0.5,
    },
    bell: {
      position: 'relative',
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: theme.colors.accentDanger,
      borderRadius: theme.radius.pill,
      minWidth: 18,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    badgeText: { color: theme.colors.white, fontSize: 10, fontWeight: '700' },
    meterWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.lg,
    },
    meter: {
      backgroundColor: theme.colors.bgGlass,
      borderWidth: 2,
      borderColor: theme.colors.accentGlow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    speed: {
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.monoBold,
      fontWeight: '700',
    },
    unit: {
      color: theme.colors.accentGlow,
      fontFamily: theme.fonts.mono,
      fontSize: 12,
      marginTop: 2,
    },
    name: {
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.display,
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.sm,
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
    meta: {
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.body,
      fontSize: 12,
      flexShrink: 1,
    },
  });
