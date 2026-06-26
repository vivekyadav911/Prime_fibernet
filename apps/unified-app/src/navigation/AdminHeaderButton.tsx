import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import {
  adminHeaderIconButtonStyle,
  adminHeaderLeftContainerStyle,
  adminHeaderRightContainerStyle,
  adminHeaderTheme,
} from '@/theme/adminHeader';

export const ADMIN_HEADER_BTN_SIZE = adminHeaderTheme.buttonSize;
export const ADMIN_HEADER_ICON_SIZE = adminHeaderTheme.iconSize;
export const ADMIN_HEADER_EDGE_INSET = adminHeaderTheme.edgeInset;

export { adminHeaderLeftContainerStyle, adminHeaderRightContainerStyle };

type AdminHeaderButtonProps = {
  accessibilityLabel: string;
  children: ReactNode;
  filled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function AdminHeaderButton({
  accessibilityLabel,
  children,
  filled = true,
  onPress,
  style,
}: AdminHeaderButtonProps) {
  const buttonStyle = [styles.button, filled && styles.filled, style];

  if (!onPress) {
    return (
      <View style={buttonStyle}>
        <View style={styles.iconSlot}>{children}</View>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [buttonStyle, pressed && styles.pressed]}
    >
      <View style={styles.iconSlot}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: ADMIN_HEADER_BTN_SIZE,
    height: ADMIN_HEADER_BTN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: adminHeaderIconButtonStyle,
  iconSlot: {
    width: ADMIN_HEADER_ICON_SIZE,
    height: ADMIN_HEADER_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
});
