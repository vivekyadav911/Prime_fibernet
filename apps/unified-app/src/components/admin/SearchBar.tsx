import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  debounceMs?: number;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search…',
  debounceMs = 300,
  style,
  containerStyle,
}: SearchBarProps) {
  const [local, setLocal] = useState(value);
  const onChangeRef = useRef(onChangeText);
  onChangeRef.current = onChangeText;

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (local !== value) {
        onChangeRef.current(local);
      }
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [local, value, debounceMs]);

  const commitSearch = () => {
    if (local !== value) {
      onChangeRef.current(local);
    }
    Keyboard.dismiss();
  };

  const clearSearch = () => {
    setLocal('');
    onChangeRef.current('');
    Keyboard.dismiss();
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        style={[styles.input, style]}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        value={local}
        onChangeText={setLocal}
        onSubmitEditing={commitSearch}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      {local.length > 0 ? (
        <Pressable
          onPress={clearSearch}
          style={styles.clearBtn}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
        >
          <Text style={styles.clearBtnText}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.md,
    padding: spacing.sm,
    paddingRight: spacing.xl,
    backgroundColor: colors.surfaceWhite,
    fontSize: 14,
    color: colors.textPrimary,
  },
  clearBtn: {
    position: 'absolute',
    right: spacing.sm,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
