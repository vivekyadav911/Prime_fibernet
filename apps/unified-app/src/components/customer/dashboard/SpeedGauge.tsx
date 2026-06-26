import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { GlassCard } from '@/components/customer/ui';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

type SpeedGaugeProps = {
  speedMbps: number;
  maxSpeedMbps?: number;
};

const SIZE = 192;
const STROKE = 4;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function SpeedGauge({ speedMbps, maxSpeedMbps = 500 }: SpeedGaugeProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();
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
            stroke={theme.colors.primary}
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

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    card: {
      flex: 1,
      minHeight: 280,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
      borderRadius: theme.radius.lg,
    },
    label: {
      position: 'absolute',
      top: theme.spacing.md,
      left: theme.spacing.md,
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
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
      color: theme.colors.primary,
      fontFamily: theme.fonts.monoBold,
      ...theme.shadow.cardGlow,
    },
    unit: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      marginTop: theme.spacing.xs,
    },
  });
