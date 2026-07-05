import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { GlassCard } from './GlassCard';
import { PressableScale } from './PressableScale';

type CustomerCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  glow?: boolean;
  padded?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

/** Standard customer surface — glass card with optional press feedback. */
export function CustomerCard({
  children,
  style,
  contentStyle,
  glow = false,
  padded = true,
  onPress,
  disabled = false,
  accessibilityLabel,
}: CustomerCardProps) {
  const card = (
    <GlassCard style={style} contentStyle={contentStyle} glow={glow} padded={padded}>
      {children}
    </GlassCard>
  );

  if (!onPress) return card;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      {card}
    </PressableScale>
  );
}
