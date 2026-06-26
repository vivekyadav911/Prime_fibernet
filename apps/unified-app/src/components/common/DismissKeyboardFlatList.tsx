import { forwardRef } from 'react';
import { FlatList, type FlatListProps } from 'react-native';

import { KEYBOARD_AWARE_LIST_PROPS, dismissKeyboardOnScrollBeginDrag } from './keyboardBehavior';

export const DismissKeyboardFlatList = forwardRef(function DismissKeyboardFlatList<ItemT>(
  { keyboardShouldPersistTaps, keyboardDismissMode, onScrollBeginDrag, ...rest }: FlatListProps<ItemT>,
  ref: React.Ref<FlatList<ItemT>>,
) {
  return (
    <FlatList
      ref={ref}
      {...KEYBOARD_AWARE_LIST_PROPS}
      {...rest}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps ?? KEYBOARD_AWARE_LIST_PROPS.keyboardShouldPersistTaps}
      keyboardDismissMode={keyboardDismissMode ?? KEYBOARD_AWARE_LIST_PROPS.keyboardDismissMode}
      onScrollBeginDrag={(event) => {
        dismissKeyboardOnScrollBeginDrag(event);
        onScrollBeginDrag?.(event);
      }}
    />
  );
}) as <ItemT>(props: FlatListProps<ItemT> & { ref?: React.Ref<FlatList<ItemT>> }) => React.ReactElement;
