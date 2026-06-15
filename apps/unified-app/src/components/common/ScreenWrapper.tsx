import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Screen } from '@prime/ui';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

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
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, padded && styles.scrollPadded]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {inner}
          </ScrollView>
        ) : (
          <View style={[styles.flex, padded && styles.inner]}>{children}</View>
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
