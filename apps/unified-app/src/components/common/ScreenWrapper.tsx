import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Screen } from '@prime/ui';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import { DismissKeyboardScrollView } from './DismissKeyboardScrollView';
import { KeyboardDismissView } from './KeyboardDismissView';

type ScreenWrapperProps = {
  children: React.ReactNode;
  scrollable?: boolean;
  padded?: boolean;
  background?: string;
  safeAreaTop?: boolean;
};

export function ScreenWrapper({
  children,
  scrollable = true,
  padded = true,
  background = colors.background,
  safeAreaTop = false,
}: ScreenWrapperProps) {
  const inner = padded ? <View style={styles.inner}>{children}</View> : children;

  return (
    <Screen padded={false} safeAreaTop={safeAreaTop} style={{ backgroundColor: background }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {scrollable ? (
          <DismissKeyboardScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, padded && styles.scrollPadded]}
            showsVerticalScrollIndicator={false}
          >
            {inner}
          </DismissKeyboardScrollView>
        ) : (
          <KeyboardDismissView style={[styles.flex, padded && styles.inner]}>{children}</KeyboardDismissView>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  inner: { paddingHorizontal: spacing.md },
  scrollContent: { paddingBottom: spacing.xxl },
  scrollPadded: { paddingHorizontal: spacing.md },
});
