import type { ReactNode } from 'react';
import { Keyboard, Platform, StyleSheet, TouchableWithoutFeedback, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from './theme';

type ScreenProps = ViewProps & {
  padded?: boolean;
  /** Disable when the screen sits below a navigation header that already handles the top inset. */
  safeAreaTop?: boolean;
  /** Wrap content in tap-to-dismiss keyboard behavior. Default true. */
  keyboardDismiss?: boolean;
};

export function Screen({
  children,
  padded = true,
  safeAreaTop = true,
  keyboardDismiss = true,
  style,
  ...props
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const content = (
    <View style={[styles.container, padded && styles.padded, style]} {...props}>
      {children}
    </View>
  );

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
      {keyboardDismiss ? (
        <KeyboardDismissWrapper>{content}</KeyboardDismissWrapper>
      ) : (
        content
      )}
    </View>
  );
}

function KeyboardDismissWrapper({ children }: { children: ReactNode }) {
  if (Platform.OS === 'web') {
    return <View style={styles.container}>{children}</View>;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={StyleSheet.absoluteFillObject} />
      </TouchableWithoutFeedback>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
    ...(Platform.OS === 'web' ? { minHeight: 0 } : null),
  },
  container: {
    flex: 1,
    ...(Platform.OS === 'web' ? { minHeight: 0 } : null),
  },
  padded: {
    padding: 16,
  },
});
