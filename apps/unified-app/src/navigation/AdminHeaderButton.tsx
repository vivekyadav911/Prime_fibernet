import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export const ADMIN_HEADER_BTN_SIZE = 40;
export const ADMIN_HEADER_ICON_SIZE = 24;
export const ADMIN_HEADER_EDGE_INSET = 10;

export const adminHeaderLeftContainerStyle: ViewStyle = {
  paddingStart: ADMIN_HEADER_EDGE_INSET,
  paddingEnd: 0,
  alignItems: 'center',
  justifyContent: 'center',
  alignSelf: 'stretch',
};

export const adminHeaderRightContainerStyle: ViewStyle = {
  paddingStart: 0,
  paddingEnd: ADMIN_HEADER_EDGE_INSET,
  alignItems: 'center',
  justifyContent: 'center',
  alignSelf: 'stretch',
};

type AdminHeaderButtonProps = {
  accessibilityLabel: string;
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function AdminHeaderButton({
  accessibilityLabel,
  children,
  onPress,
  style,
}: AdminHeaderButtonProps) {
  const content = (
    <View style={[styles.button, style]}>
      <View style={styles.iconSlot}>{children}</View>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
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
  iconSlot: {
    width: ADMIN_HEADER_ICON_SIZE,
    height: ADMIN_HEADER_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
