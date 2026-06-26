import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { GlassCard } from '@/components/customer/ui';
import { signalGlass } from '@/theme/customer/signalGlass';

type SpeedGaugeProps = {
  speedMbps: number;
  maxSpeedMbps?: number;
};

const SIZE = 192;
const STROKE = 4;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function SpeedGauge({ speedMbps, maxSpeedMbps = 500 }: SpeedGaugeProps) {
  const progress = Math.min(speedMbps / maxSpeedMbps, 1);
  const dashOffset = CIRCUMFERENCE * (1 - progress * 0.79);

  return (
    <GlassCard style={styles.card} padded={false}>
      <Text style={styles.label}>Live Speed</Text>
      <View style={styles.gaugeWrap}>
        <Svg width={SIZE} height={SIZE} style={styles.svg}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={2}
            fill="none"
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={signalGlass.colors.primary}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            rotation={-90}
            origin={`${SIZE / 2}, ${SIZE / 2}`}
          />
        </Svg>
        <View style={styles.center}>
          <Text style={styles.speed}>{speedMbps}</Text>
          <Text style={styles.unit}>Mbps</Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    padding: signalGlass.spacing.xl,
    borderRadius: signalGlass.radius.lg,
  },
  label: {
    position: 'absolute',
    top: signalGlass.spacing.md,
    left: signalGlass.spacing.md,
    ...signalGlass.typography.body,
    color: signalGlass.colors.onSurfaceVariant,
    fontFamily: signalGlass.fonts.body,
  },
  gaugeWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  center: {
    alignItems: 'center',
  },
  speed: {
    fontSize: 40,
    fontWeight: '700',
    color: signalGlass.colors.primary,
    fontFamily: signalGlass.fonts.monoBold,
    ...signalGlass.shadow.cardGlow,
  },
  unit: {
    ...signalGlass.typography.body,
    color: signalGlass.colors.onSurfaceVariant,
    fontFamily: signalGlass.fonts.body,
    marginTop: signalGlass.spacing.xs,
  },
});
