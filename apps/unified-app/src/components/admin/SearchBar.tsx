import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { adminColors } from '@/theme/admin';
import { adminDesign, adminInputStyle } from '@/theme/adminDesign';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

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
  const [focused, setFocused] = useState(false);
  const onChangeRef = useRef(onChangeText);
  const latestLocalRef = useRef(local);
  const latestValueRef = useRef(value);

  onChangeRef.current = onChangeText;
  latestLocalRef.current = local;
  latestValueRef.current = value;

  useEffect(() => {
    if (value === '') {
      setLocal('');
      return;
    }
    if (!focused) {
      setLocal(value);
    }
  }, [value, focused]);

  useEffect(() => {
    if (debounceMs <= 0) return;
    const timer = setTimeout(() => {
      const pending = latestLocalRef.current;
      if (pending !== latestValueRef.current) {
        onChangeRef.current(pending);
      }
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [local, debounceMs]);

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
      <Ionicons
        name="search-outline"
        size={20}
        color={colors.textSecondary}
        style={styles.searchIcon}
      />
      <TextInput
        style={[styles.input, focused && styles.inputFocused, style]}
        placeholder={placeholder}
        placeholderTextColor={adminDesign.colors.textMuted}
        value={local}
        onChangeText={setLocal}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          if (local !== value) {
            onChangeRef.current(local);
          }
        }}
        onSubmitEditing={commitSearch}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {local.length > 0 ? (
        <Pressable
          onPress={clearSearch}
          style={styles.clearBtn}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
        >
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 1,
  },
  input: {
    ...adminInputStyle,
    flex: 1,
    fontSize: adminDesign.input.fontSize,
    color: colors.textPrimary,
    paddingLeft: spacing.xl + spacing.sm,
    paddingRight: spacing.xl + spacing.sm,
  },
  inputFocused: {
    borderColor: adminColors.primary,
  },
  clearBtn: {
    position: 'absolute',
    right: spacing.md,
    width: adminDesign.layout.minTouch,
    height: adminDesign.layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
