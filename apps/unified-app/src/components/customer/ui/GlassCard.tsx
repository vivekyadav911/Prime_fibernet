import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { signalGlass } from '@/theme/customer/signalGlass';
import { isBlurUnavailable } from '@/utils/expoRuntime';

type GlassCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
  padded?: boolean;
};

function CardInner({ children, padded }: { children: ReactNode; padded: boolean }) {
  return (
    <LinearGradient
      colors={[...signalGlass.gradients.card]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.inner, padded && styles.padded]}
    >
      {children}
    </LinearGradient>
  );
}

export function GlassCard({ children, style, glow = false, padded = true }: GlassCardProps) {
  const useSolidFallback = isBlurUnavailable();

  return (
    <View style={[styles.wrap, glow && signalGlass.shadow.cardGlow, style]}>
      {useSolidFallback ? (
        <View style={styles.solidFallback}>
          <CardInner padded={padded}>{children}</CardInner>
        </View>
      ) : (
        <BlurView intensity={signalGlass.blur.cardIntensity} tint="dark" style={styles.blur}>
          <CardInner padded={padded}>{children}</CardInner>
        </BlurView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: signalGlass.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: signalGlass.colors.borderGlass,
  },
  blur: { overflow: 'hidden' },
  solidFallback: {
    overflow: 'hidden',
    backgroundColor: signalGlass.colors.bgGlass,
  },
  inner: { backgroundColor: signalGlass.colors.bgGlass },
  padded: { padding: signalGlass.spacing.lg },
});
