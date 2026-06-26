import { Keyboard } from 'react-native';
import type { FlatListProps, NativeScrollEvent, NativeSyntheticEvent, ScrollViewProps } from 'react-native';

export const dismissKeyboardOnScrollBeginDrag = (_event?: NativeSyntheticEvent<NativeScrollEvent>) => {
  Keyboard.dismiss();
};

export const KEYBOARD_AWARE_SCROLL_PROPS: Pick<
  ScrollViewProps,
  'keyboardShouldPersistTaps' | 'keyboardDismissMode' | 'onScrollBeginDrag'
> = {
  keyboardShouldPersistTaps: 'handled',
  keyboardDismissMode: 'on-drag',
  onScrollBeginDrag: dismissKeyboardOnScrollBeginDrag,
};

export const KEYBOARD_AWARE_LIST_PROPS: Pick<
  FlatListProps<unknown>,
  'keyboardShouldPersistTaps' | 'keyboardDismissMode' | 'onScrollBeginDrag'
> = {
  keyboardShouldPersistTaps: 'handled',
  keyboardDismissMode: 'on-drag',
  onScrollBeginDrag: dismissKeyboardOnScrollBeginDrag,
};
