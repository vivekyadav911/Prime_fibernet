import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { GlassCard } from '@/components/customer/ui';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

type SpeedGaugeProps = {
  speedMbps?: number | null;
  maxSpeedMbps?: number;
  isActive?: boolean;
};

const WIDTH = 200;
const HEIGHT = 120;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT - 8;
const RADIUS = 80;
const STROKE = 6;

function polarToCartesian(angle: number): { x: number; y: number } {
  return {
    x: CENTER_X + RADIUS * Math.cos(angle),
    y: CENTER_Y - RADIUS * Math.sin(angle),
  };
}

function describeArc(startAngle: number, endAngle: number): string {
  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);
  const sweep = endAngle - startAngle;
  const largeArcFlag = sweep > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

export function SpeedGauge({ speedMbps, maxSpeedMbps = 500, isActive = true }: SpeedGaugeProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();

  const trackPath = describeArc(Math.PI, 0);
  const hasSpeed = isActive && speedMbps != null && speedMbps > 0;
  const progress = hasSpeed ? Math.min(speedMbps / maxSpeedMbps, 1) : 0;
  const valueAngle = Math.PI - progress * Math.PI;
  const valuePath = hasSpeed ? describeArc(Math.PI, valueAngle) : '';

  return (
    <GlassCard style={styles.card} padded={false}>
      <Text style={styles.label}>Live Speed</Text>
      <View style={styles.gaugeWrap}>
        <Svg width={WIDTH} height={HEIGHT} style={styles.svg}>
          <Path
            d={trackPath}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
          />
          {valuePath ? (
            <Path
              d={valuePath}
              stroke={theme.colors.primary}
              strokeWidth={STROKE}
              fill="none"
              strokeLinecap="round"
            />
          ) : null}
        </Svg>
        <View style={styles.center}>
          {hasSpeed ? (
            <>
              <Text style={styles.speed}>{Math.round(speedMbps)}</Text>
              <Text style={styles.unit}>Mbps</Text>
            </>
          ) : (
            <>
              <Text style={styles.inactiveSpeed}>--</Text>
              <Text style={styles.unit}>{isActive ? 'Mbps' : 'Service Inactive'}</Text>
            </>
          )}
        </View>
      </View>
    </GlassCard>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    card: {
      flex: 1,
      minHeight: 200,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
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
      width: WIDTH,
      height: HEIGHT,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    svg: {
      position: 'absolute',
      bottom: 0,
    },
    center: {
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    speed: {
      fontSize: 40,
      fontWeight: '700',
      color: theme.colors.primary,
      fontFamily: theme.fonts.monoBold,
      ...theme.shadow.cardGlow,
    },
    inactiveSpeed: {
      fontSize: 36,
      fontWeight: '700',
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.monoBold,
    },
    unit: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      marginTop: theme.spacing.xs,
      textAlign: 'center',
    },
  });
