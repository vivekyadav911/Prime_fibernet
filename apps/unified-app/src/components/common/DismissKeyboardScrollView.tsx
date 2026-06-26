import { forwardRef } from 'react';
import { Platform, ScrollView, type ScrollViewProps } from 'react-native';

import { KEYBOARD_AWARE_SCROLL_PROPS, dismissKeyboardOnScrollBeginDrag } from './keyboardBehavior';
import { scrollLayoutStyles } from './scrollLayoutStyles';

export const DismissKeyboardScrollView = forwardRef<ScrollView, ScrollViewProps>(
  function DismissKeyboardScrollView(
    { keyboardShouldPersistTaps, keyboardDismissMode, onScrollBeginDrag, style, ...rest },
    ref,
  ) {
    return (
      <ScrollView
        ref={ref}
        {...KEYBOARD_AWARE_SCROLL_PROPS}
        {...rest}
        style={[scrollLayoutStyles.scrollContainer, style]}
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
