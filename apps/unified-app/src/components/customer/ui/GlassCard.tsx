import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';
import { isBlurUnavailable } from '@/utils/expoRuntime';

type GlassCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
  padded?: boolean;
};

function CardInner({ children, padded, theme }: { children: ReactNode; padded: boolean; theme: CustomerTheme }) {
  return (
    <LinearGradient
      colors={theme.gradients.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[padded && { padding: theme.spacing.lg }]}
    >
      {children}
    </LinearGradient>
  );
}

export function GlassCard({ children, style, glow = false, padded = true }: GlassCardProps) {
  const { theme } = useCustomerTheme();
  const styles = useThemedStyles(createStyles);
  const useSolidFallback = isBlurUnavailable() || !theme.useGlassBlur;

  return (
    <View style={[styles.wrap, glow && theme.shadow.cardGlow, style]}>
      {useSolidFallback ? (
        <View style={styles.solidFallback}>
          <CardInner padded={padded} theme={theme}>
            {children}
          </CardInner>
        </View>
      ) : (
        <BlurView intensity={theme.blur.cardIntensity} tint={theme.blurTint} style={styles.blur}>
          <CardInner padded={padded} theme={theme}>
            {children}
          </CardInner>
        </BlurView>
      )}
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    wrap: {
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
    },
    blur: { overflow: 'hidden' },
    solidFallback: {
      overflow: 'hidden',
      backgroundColor: theme.colors.bgSurface,
    },
  });
