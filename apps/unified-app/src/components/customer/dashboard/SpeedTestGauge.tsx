import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { SpeedTestPhase } from '@/types/speedTest';
import type { CustomerTheme } from '@/theme/customer';

const SCREEN_W = Dimensions.get('window').width;
const GAUGE_SIZE = Math.min(SCREEN_W - 64, 280);
const R = GAUGE_SIZE / 2 - 16;
const CX = GAUGE_SIZE / 2;
const CY = GAUGE_SIZE / 2 + 20;
const STROKE_WIDTH = 14;

type SpeedTestGaugeProps = {
  phase: SpeedTestPhase;
  displaySpeed: number | null;
  maxSpeedMbps: number;
  pulseAnim: Animated.Value;
};

function polarToXY(angleDeg: number, radius: number, cx: number, cy: number) {
  const rad = ((angleDeg - 180) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function buildArcPath(value: number, maxSpeed: number): string {
  const valueDeg = (Math.min(value, maxSpeed) / maxSpeed) * 180;
  const endAngle = 180 - valueDeg;
  const start = polarToXY(180, R, CX, CY);
  const end = polarToXY(endAngle, R, CX, CY);
  const large = valueDeg > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${R} ${R} 0 ${large} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function buildBackgroundArc(): string {
  const start = polarToXY(180, R, CX, CY);
  const end = polarToXY(0, R, CX, CY);
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${R} ${R} 0 1 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function buildTickMarks(maxSpeed: number) {
  const ticks = [];
  const steps = maxSpeed <= 50 ? 5 : maxSpeed <= 200 ? 10 : 20;
  for (let v = 0; v <= maxSpeed; v += steps) {
    const angleDeg = 180 - (v / maxSpeed) * 180;
    const outer = polarToXY(angleDeg, R + 2, CX, CY);
    const inner = polarToXY(angleDeg, R - 10, CX, CY);
    const label = polarToXY(angleDeg, R - 22, CX, CY);
    ticks.push({ outer, inner, label, value: v, isMajor: v % (steps * 2) === 0 });
  }
  return ticks;
}

function phaseLabel(phase: SpeedTestPhase): string {
  switch (phase) {
    case 'ping':
      return 'Measuring latency…';
    case 'download':
      return 'Testing download speed…';
    case 'upload':
      return 'Testing upload speed…';
    case 'complete':
      return 'Test complete';
    case 'error':
      return 'Test failed';
    default:
      return 'Ready to test';
  }
}

export function SpeedTestGauge({ phase, displaySpeed, maxSpeedMbps, pulseAnim }: SpeedTestGaugeProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();
  const animatedSpeed = useRef(new Animated.Value(0)).current;

  const arcColor = useMemo(() => {
    switch (phase) {
      case 'download':
      case 'complete':
        return theme.colors.primary;
      case 'upload':
        return theme.colors.accentSuccess;
      case 'error':
        return theme.colors.accentDanger;
      default:
        return theme.colors.textMuted;
    }
  }, [phase, theme.colors]);

  const phaseStyle = useMemo(() => {
    switch (phase) {
      case 'download':
      case 'complete':
        return styles.phaseDownload;
      case 'upload':
        return styles.phaseUpload;
      case 'error':
        return styles.phaseError;
      default:
        return styles.phaseIdle;
    }
  }, [phase, styles]);

  useEffect(() => {
    Animated.timing(animatedSpeed, {
      toValue: displaySpeed ?? 0,
      duration: 400,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [animatedSpeed, displaySpeed]);

  const ticks = buildTickMarks(maxSpeedMbps);
  const arcPath = displaySpeed != null && displaySpeed > 0 ? buildArcPath(displaySpeed, maxSpeedMbps) : '';

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.gaugeWrap, { transform: [{ scale: pulseAnim }] }]}>
        <Svg width={GAUGE_SIZE} height={GAUGE_SIZE * 0.65}>
          <Path
            d={buildBackgroundArc()}
            stroke={theme.colors.surfaceContainerHigh}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            fill="none"
          />
          {arcPath ? (
            <Path
              d={arcPath}
              stroke={arcColor}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              fill="none"
            />
          ) : null}
          {ticks.map((tick, i) => (
            <Path
              key={`tick-${tick.value}-${i}`}
              d={`M ${tick.outer.x.toFixed(1)} ${tick.outer.y.toFixed(1)} L ${tick.inner.x.toFixed(1)} ${tick.inner.y.toFixed(1)}`}
              stroke={tick.isMajor ? theme.colors.textMuted : theme.colors.outlineVariant}
              strokeWidth={tick.isMajor ? 2 : 1}
            />
          ))}
          {ticks
            .filter((tick) => tick.isMajor)
            .map((tick) => (
              <SvgText
                key={`label-${tick.value}`}
                x={tick.label.x}
                y={tick.label.y + 3}
                fontSize="9"
                fill={theme.colors.textMuted}
                textAnchor="middle"
              >
                {tick.value}
              </SvgText>
            ))}
          <SvgText
            x={CX}
            y={CY - 10}
            fontSize="42"
            fontWeight="800"
            fill={theme.colors.onSurface}
            textAnchor="middle"
          >
            {displaySpeed == null ? '—' : displaySpeed.toFixed(1)}
          </SvgText>
          <SvgText x={CX} y={CY + 14} fontSize="14" fill={theme.colors.onSurfaceVariant} textAnchor="middle">
            Mbps
          </SvgText>
          <SvgText x={GAUGE_SIZE - 8} y={CY + 30} fontSize="9" fill={theme.colors.textMuted} textAnchor="end">
            {maxSpeedMbps.toFixed(0)}
          </SvgText>
          <SvgText x={8} y={CY + 30} fontSize="9" fill={theme.colors.textMuted} textAnchor="start">
            0
          </SvgText>
        </Svg>
      </Animated.View>
      <Text style={[styles.phaseLabel, phaseStyle]}>{phaseLabel(phase)}</Text>
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.sm,
    },
    gaugeWrap: {
      alignItems: 'center',
    },
    phaseLabel: {
      ...theme.typography.body,
      fontFamily: theme.fonts.bodySemiBold,
      marginTop: theme.spacing.md,
      textAlign: 'center',
    },
    phaseIdle: {
      color: theme.colors.textMuted,
    },
    phaseDownload: {
      color: theme.colors.primary,
    },
    phaseUpload: {
      color: theme.colors.accentSuccess,
    },
    phaseError: {
      color: theme.colors.accentDanger,
    },
  });
