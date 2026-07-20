import { forwardRef, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DismissKeyboardScrollView } from '@/components/common';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

/** One message for any credential failure — never leak which part was wrong. */
export const GENERIC_LOGIN_ERROR = 'Incorrect email/username or password.';
/** One message for any OTP/TOTP code failure. */
export const GENERIC_CODE_ERROR = 'Invalid or expired code.';

/**
 * Shared shell for every auth screen: KeyboardAvoidingView + scroll so no input
 * is ever hidden behind the keyboard (Phase 5), with safe-area padding.
 */
export function AuthScreen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <DismissKeyboardScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </DismissKeyboardScrollView>
    </KeyboardAvoidingView>
  );
}

type AuthFieldProps = TextInputProps & { label: string; error?: string | null };

/** Black label + white, clearly-bordered input with black text (Phase 5). */
export const AuthField = forwardRef<TextInput, AuthFieldProps>(function AuthField(
  { label, error, style, ...rest },
  ref,
) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        style={[styles.input, error ? styles.inputError : null, style]}
        placeholderTextColor={colors.textSecondary}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  fieldWrap: { marginBottom: spacing.sm },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceWhite,
  },
  inputError: { borderColor: colors.errorRed },
  error: { color: colors.errorRed, fontSize: 13, marginTop: spacing.xs },
});
