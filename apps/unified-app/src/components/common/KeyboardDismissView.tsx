import type { ReactNode } from 'react';
import { Keyboard, StyleSheet, TouchableWithoutFeedback, View, type StyleProp, type ViewStyle } from 'react-native';

type KeyboardDismissViewProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function KeyboardDismissView({ children, style }: KeyboardDismissViewProps) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.root, style]}>{children}</View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
