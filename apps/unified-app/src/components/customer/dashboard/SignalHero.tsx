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
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { signalGlass } from '@/theme/customer/signalGlass';

type ConnectionStatus = 'active' | 'suspended' | 'expired';

type SignalHeroProps = {
  speedMbps: number;
  customerName: string;
  accountId: string;
  connectionStatus: ConnectionStatus;
  unreadCount: number;
  onNotificationsPress: () => void;
};

const statusColors: Record<ConnectionStatus, string> = {
  active: signalGlass.colors.accentSuccess,
  suspended: signalGlass.colors.accentWarning,
  expired: signalGlass.colors.accentDanger,
};

function PulseRing({ delay, size }: { delay: number; size: number }) {
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
  const meterSize = Math.min(120, Math.max(96, width * 0.28));

  return (
    <GlassCard glow padded={false} style={styles.card}>
      <LinearGradient
        colors={[...signalGlass.gradients.hero]}
        style={[styles.gradient, { paddingTop: insets.top + signalGlass.spacing.lg }]}
      >
        <View style={styles.topRow}>
          <Text style={styles.brand}>Prime Fibernet</Text>
          <Pressable
            accessibilityLabel="Notifications"
            onPress={onNotificationsPress}
            style={styles.bell}
            hitSlop={8}
          >
            <Ionicons name="notifications-outline" size={24} color={signalGlass.colors.textPrimary} />
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

const styles = StyleSheet.create({
  card: { marginBottom: signalGlass.spacing.lg, marginHorizontal: -signalGlass.spacing.lg },
  gradient: {
    padding: signalGlass.spacing.xl,
    paddingTop: signalGlass.spacing.xl,
    borderRadius: signalGlass.radius.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: signalGlass.spacing.xl,
  },
  brand: {
    color: signalGlass.colors.textSecondary,
    fontFamily: signalGlass.fonts.bodyMedium,
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
    backgroundColor: signalGlass.colors.accentDanger,
    borderRadius: signalGlass.radius.pill,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: signalGlass.colors.white, fontSize: 10, fontWeight: '700' },
  meterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: signalGlass.spacing.lg,
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: signalGlass.colors.accentPrimary,
  },
  meter: {
    backgroundColor: signalGlass.colors.bgGlass,
    borderWidth: 2,
    borderColor: signalGlass.colors.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speed: {
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.monoBold,
    fontWeight: '700',
  },
  unit: {
    color: signalGlass.colors.accentGlow,
    fontFamily: signalGlass.fonts.mono,
    fontSize: 12,
    marginTop: 2,
  },
  name: {
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.display,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: signalGlass.spacing.sm,
    gap: signalGlass.spacing.xs,
    paddingHorizontal: signalGlass.spacing.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  meta: {
    color: signalGlass.colors.textSecondary,
    fontFamily: signalGlass.fonts.body,
    fontSize: 12,
    flexShrink: 1,
  },
});
