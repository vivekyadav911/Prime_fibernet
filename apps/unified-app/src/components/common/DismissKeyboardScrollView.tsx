import { forwardRef, useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, type ScrollViewProps } from 'react-native';

import { useKeyboardBottomInset } from '@/hooks/useKeyboardBottomInset';
import { spacing } from '@/theme/spacing';
import { KEYBOARD_AWARE_SCROLL_PROPS, dismissKeyboardOnScrollBeginDrag } from './keyboardBehavior';
import { scrollLayoutStyles } from './scrollLayoutStyles';

export const DismissKeyboardScrollView = forwardRef<ScrollView, ScrollViewProps>(
  function DismissKeyboardScrollView(
    { keyboardShouldPersistTaps, keyboardDismissMode, onScrollBeginDrag, style, contentContainerStyle, ...rest },
    ref,
  ) {
    const keyboardInset = useKeyboardBottomInset(spacing.md);
    const mergedContentStyle = useMemo(
      () =>
        StyleSheet.flatten([
          contentContainerStyle,
          keyboardInset > 0 ? { paddingBottom: keyboardInset } : null,
        ]),
      [contentContainerStyle, keyboardInset],
    );

    return (
      <ScrollView
        ref={ref}
        {...KEYBOARD_AWARE_SCROLL_PROPS}
        {...rest}
        style={[scrollLayoutStyles.scrollContainer, style]}
        contentContainerStyle={mergedContentStyle}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps ?? KEYBOARD_AWARE_SCROLL_PROPS.keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode ?? KEYBOARD_AWARE_SCROLL_PROPS.keyboardDismissMode}
        onScrollBeginDrag={(event) => {
          dismissKeyboardOnScrollBeginDrag(event);
          onScrollBeginDrag?.(event);
        }}
        {...(Platform.OS === 'web'
          ? {
              // RN Web maps this to overflow styles for smoother page scrolling.
              overScrollMode: 'always' as const,
            }
          : null)}
      />
    );
  },
);
