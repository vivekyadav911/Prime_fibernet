import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { adminScreenStyles } from '@/theme/adminScreenStyles';

type AdminStateCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Wraps empty/error/loading content in the standard premium card surface. */
export function AdminStateCard({ children, style }: AdminStateCardProps) {
  return <View style={[adminScreenStyles.stateCard, styles.center, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  center: { alignItems: 'stretch' },
});
