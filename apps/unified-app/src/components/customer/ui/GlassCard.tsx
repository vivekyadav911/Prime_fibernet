import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { signalGlass } from '@/theme/customer/signalGlass';

type GlassCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
  padded?: boolean;
};

export function GlassCard({ children, style, glow = false, padded = true }: GlassCardProps) {
  return (
    <View style={[styles.wrap, glow && signalGlass.shadow.cardGlow, style]}>
      <BlurView intensity={28} tint="dark" style={styles.blur}>
        <LinearGradient
          colors={['rgba(59,130,246,0.12)', 'rgba(255,255,255,0.04)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.inner, padded && styles.padded]}
        >
          {children}
        </LinearGradient>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: signalGlass.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
  },
  blur: { overflow: 'hidden' },
  inner: { backgroundColor: signalGlass.colors.bgGlass },
  padded: { padding: signalGlass.spacing.lg },
});
