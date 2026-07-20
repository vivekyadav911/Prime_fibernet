import { KeyboardAvoidingView, Platform, RefreshControl, StyleSheet, View } from 'react-native';
import { Screen } from '@prime/ui';

import { useKeyboardVerticalOffset } from '@/hooks/useKeyboardVerticalOffset';
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
  /** Set false when the screen manages its own KeyboardAvoidingView (e.g. chat). */
  keyboardAvoiding?: boolean;
  refreshing?: boolean;
  onRefresh?: () => unknown;
};

export function ScreenWrapper({
  children,
  scrollable = true,
  padded = true,
  background = colors.background,
  safeAreaTop = false,
  keyboardAvoiding = true,
  refreshing = false,
  onRefresh,
}: ScreenWrapperProps) {
  const inner = padded ? <View style={styles.inner}>{children}</View> : children;
  const keyboardOffset = useKeyboardVerticalOffset(Platform.OS === 'android' ? 8 : 0);
  const refreshControl =
    onRefresh != null ? (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={() => void onRefresh()}
        tintColor={colors.primaryNavy}
        colors={[colors.primaryNavy]}
      />
    ) : undefined;

  const body = scrollable ? (
    <DismissKeyboardScrollView
      style={scrollLayoutStyles.scrollContainer}
      contentContainerStyle={[styles.scrollContent, padded && styles.scrollPadded]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {inner}
    </DismissKeyboardScrollView>
  ) : (
    <KeyboardDismissView style={[scrollLayoutStyles.flex, padded && styles.inner]}>{children}</KeyboardDismissView>
  );

  return (
    <Screen keyboardDismiss={false} padded={false} safeAreaTop={safeAreaTop} style={{ backgroundColor: background }}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={scrollLayoutStyles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={keyboardOffset}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  inner: { paddingHorizontal: spacing.md },
  scrollContent: { paddingBottom: spacing.xxl },
  scrollPadded: { paddingHorizontal: spacing.md },
});
