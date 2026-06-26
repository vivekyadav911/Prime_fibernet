import { forwardRef } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';

import { KEYBOARD_AWARE_SCROLL_PROPS, dismissKeyboardOnScrollBeginDrag } from './keyboardBehavior';

export const DismissKeyboardScrollView = forwardRef<ScrollView, ScrollViewProps>(
  function DismissKeyboardScrollView({ keyboardShouldPersistTaps, keyboardDismissMode, onScrollBeginDrag, ...rest }, ref) {
    return (
      <ScrollView
        ref={ref}
        {...KEYBOARD_AWARE_SCROLL_PROPS}
        {...rest}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps ?? KEYBOARD_AWARE_SCROLL_PROPS.keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode ?? KEYBOARD_AWARE_SCROLL_PROPS.keyboardDismissMode}
        onScrollBeginDrag={(event) => {
          dismissKeyboardOnScrollBeginDrag(event);
          onScrollBeginDrag?.(event);
        }}
      />
    );
  },
);
