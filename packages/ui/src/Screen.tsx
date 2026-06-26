import { StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from './theme';

type ScreenProps = ViewProps & {
  padded?: boolean;
  /** Disable when the screen sits below a navigation header that already handles the top inset. */
  safeAreaTop?: boolean;
  /**
   * @deprecated Tap-to-dismiss is handled by DismissKeyboardScrollView / FlatList keyboardDismissMode.
   * Keeping the prop for compatibility — it no longer wraps content in a touchable that blocks scroll gestures.
   */
  keyboardDismiss?: boolean;
};

export function Screen({
  children,
  padded = true,
  safeAreaTop = true,
  keyboardDismiss: _keyboardDismiss = true,
  style,
  ...props
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.safe,
        {
          paddingTop: safeAreaTop ? insets.top : 0,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={[styles.container, padded && styles.padded, style]} {...props}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  container: {
    flex: 1,
  },
  padded: {
    padding: 16,
  },
});
