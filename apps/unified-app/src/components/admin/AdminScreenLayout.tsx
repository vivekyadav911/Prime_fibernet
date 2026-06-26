import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Screen } from '@prime/ui';

import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { spacing } from '@/theme/spacing';

type AdminScreenLayoutProps = {
  children: ReactNode;
  /** Extra style on the inner content container (below header). */
  contentStyle?: StyleProp<ViewStyle>;
  /** When true, applies standard horizontal page padding. */
  padded?: boolean;
};

/**
 * Standard admin page shell — use under the navigation header on every admin screen.
 * Handles canvas background, safe-area below header, and consistent horizontal padding.
 */
export function AdminScreenLayout({
  children,
  contentStyle,
  padded = false,
}: AdminScreenLayoutProps) {
  return (
    <Screen padded={false} safeAreaTop={false} style={adminScreenStyles.canvas}>
      <View style={[padded ? styles.padded : styles.fill, contentStyle]}>{children}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  padded: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
