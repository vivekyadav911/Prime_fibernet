import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

import { spacing } from '@/theme/spacing';

const WEB_MAX_WIDTH = 1400;

type AdminWebLayoutProps = {
  children: ReactNode;
};

/** Constrains admin content width on desktop web while leaving mobile layout unchanged. */
export function AdminWebLayout({ children }: AdminWebLayoutProps) {
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1024;

  if (!isDesktopWeb) {
    return <>{children}</>;
  }

  return (
    <View style={styles.outer}>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: WEB_MAX_WIDTH,
  },
});
