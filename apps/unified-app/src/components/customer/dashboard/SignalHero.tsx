import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { GlassCard } from '@/components/customer/ui';
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

function PulseRing({ delay }: { delay: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(withTiming(1.4, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, false),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, false),
    );
  }, [delay, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.ring, style]} />;
}

export function SignalHero({
  speedMbps,
  customerName,
  accountId,
  connectionStatus,
  unreadCount,
  onNotificationsPress,
}: SignalHeroProps) {
  return (
    <GlassCard glow padded={false} style={styles.card}>
      <LinearGradient
        colors={['rgba(59,130,246,0.25)', 'rgba(10,15,30,0.9)']}
        style={styles.gradient}
      >
        <View style={styles.topRow}>
          <Text style={styles.brand}>Prime Fibernet</Text>
          <Pressable
            accessibilityLabel="Notifications"
            onPress={onNotificationsPress}
            style={styles.bell}
          >
            <Text style={styles.bellIcon}>🔔</Text>
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.meterWrap}>
          <PulseRing delay={0} />
          <PulseRing delay={400} />
          <PulseRing delay={800} />
          <View style={styles.meter}>
            <Text style={styles.speed}>{speedMbps}</Text>
            <Text style={styles.unit}>Mbps</Text>
          </View>
        </View>

        <Text style={styles.name}>{customerName}</Text>
        <View style={styles.metaRow}>
          <View style={[styles.dot, { backgroundColor: statusColors[connectionStatus] }]} />
          <Text style={styles.meta}>
            {accountId} · {connectionStatus.toUpperCase()}
          </Text>
        </View>
      </LinearGradient>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: signalGlass.spacing.lg },
  gradient: {
    padding: signalGlass.spacing.xl,
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
  bell: { position: 'relative', padding: signalGlass.spacing.xs },
  bellIcon: { fontSize: 22 },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
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
    height: 160,
    marginBottom: signalGlass.spacing.lg,
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: signalGlass.colors.accentPrimary,
  },
  meter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: signalGlass.colors.bgGlass,
    borderWidth: 2,
    borderColor: signalGlass.colors.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speed: {
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.monoBold,
    fontSize: 32,
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
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  meta: {
    color: signalGlass.colors.textSecondary,
    fontFamily: signalGlass.fonts.body,
    fontSize: 12,
  },
});
