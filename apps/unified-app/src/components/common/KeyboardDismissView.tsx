import type { ReactNode } from 'react';
import {
  Keyboard,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type KeyboardDismissViewProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Tap-outside dismiss wrapper. On web, renders a plain View so TextInputs receive focus. */
export function KeyboardDismissView({ children, style }: KeyboardDismissViewProps) {
  if (Platform.OS === 'web') {
    return <View style={[styles.root, style]}>{children}</View>;
  }

  return (
    <View style={[styles.root, style]} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={StyleSheet.absoluteFillObject} />
      </TouchableWithoutFeedback>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
