import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Screen } from '@prime/ui';

import { DismissKeyboardScrollView } from '@/components/common/DismissKeyboardScrollView';
import { scrollLayoutStyles } from '@/components/common/scrollLayoutStyles';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { pageLayoutStyles } from '@/theme/pageLayout';

type AdminScreenLayoutProps = {
  children: ReactNode;
  /** Extra style on the inner content container. */
  contentStyle?: StyleProp<ViewStyle>;
  /** When true, wraps children in a single DismissKeyboardScrollView. */
  scroll?: boolean;
  /** When true, applies standard horizontal page padding + top gap. Default true for scroll, false for static/list shells. */
  padded?: boolean;
};

/**
 * Standard admin page shell — use on every screen under AdminAppBar / stack header.
 * Does NOT add safe-area top inset (the header already does).
 */
export function AdminScreenLayout({
  children,
  contentStyle,
  scroll = false,
  padded,
}: AdminScreenLayoutProps) {
  const applyPadding = padded ?? scroll;

  if (scroll) {
    return (
      <Screen padded={false} safeAreaTop={false} style={adminScreenStyles.canvas}>
        <DismissKeyboardScrollView
          style={scrollLayoutStyles.scrollContainer}
          contentContainerStyle={[
            applyPadding ? pageLayoutStyles.scrollContent : styles.scrollBare,
            contentStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </DismissKeyboardScrollView>
      </Screen>
    );
  }

  return (
    <Screen padded={false} safeAreaTop={false} style={adminScreenStyles.canvas}>
      <View
        style={[
          styles.fill,
          applyPadding ? pageLayoutStyles.body : null,
          contentStyle,
        ]}
      >
        {children}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: Platform.select({
    web: { flex: 1, minHeight: 0 },
    default: { flex: 1 },
  }),
  scrollBare: {
    paddingBottom: pageLayoutStyles.scrollContent.paddingBottom,
  },
});
