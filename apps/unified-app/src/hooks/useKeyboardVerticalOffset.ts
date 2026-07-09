import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Native stack header height below the status bar (officer stacks). */
const NATIVE_STACK_HEADER_HEIGHT = 56;

/**
 * Offset for KeyboardAvoidingView on screens rendered below a React Navigation stack header.
 */
export function useKeyboardVerticalOffset(extra = 0): number {
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'web') return extra;
  return insets.top + NATIVE_STACK_HEADER_HEIGHT + extra;
}
