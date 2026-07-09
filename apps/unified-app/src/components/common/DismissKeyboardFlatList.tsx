import { forwardRef, useMemo } from 'react';
import { FlatList, StyleSheet, type FlatListProps } from 'react-native';

import { useKeyboardBottomInset } from '@/hooks/useKeyboardBottomInset';
import { spacing } from '@/theme/spacing';
import { KEYBOARD_AWARE_LIST_PROPS, dismissKeyboardOnScrollBeginDrag } from './keyboardBehavior';
import { scrollLayoutStyles } from './scrollLayoutStyles';

export const DismissKeyboardFlatList = forwardRef(function DismissKeyboardFlatList<ItemT>(
  {
    keyboardShouldPersistTaps,
    keyboardDismissMode,
    onScrollBeginDrag,
    style,
    contentContainerStyle,
    ...rest
  }: FlatListProps<ItemT>,
  ref: React.Ref<FlatList<ItemT>>,
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
    <FlatList
      ref={ref}
      {...KEYBOARD_AWARE_LIST_PROPS}
      style={[scrollLayoutStyles.scrollContainer, style]}
      contentContainerStyle={mergedContentStyle}
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
