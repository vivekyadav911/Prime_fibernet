import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Screen } from '@prime/ui';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import { DismissKeyboardScrollView } from './DismissKeyboardScrollView';
import { KeyboardDismissView } from './KeyboardDismissView';
import { scrollLayoutStyles } from './scrollLayoutStyles';

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
    <Screen keyboardDismiss={false} padded={false} safeAreaTop={safeAreaTop} style={{ backgroundColor: background }}>
      <KeyboardAvoidingView
        style={scrollLayoutStyles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {scrollable ? (
          <DismissKeyboardScrollView
            style={scrollLayoutStyles.scrollContainer}
            contentContainerStyle={[styles.scrollContent, padded && styles.scrollPadded]}
            showsVerticalScrollIndicator={false}
          >
            {inner}
          </DismissKeyboardScrollView>
        ) : (
          <KeyboardDismissView style={[scrollLayoutStyles.flex, padded && styles.inner]}>{children}</KeyboardDismissView>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inner: { paddingHorizontal: spacing.md },
  scrollContent: { paddingBottom: spacing.xxl },
  scrollPadded: { paddingHorizontal: spacing.md },
});
