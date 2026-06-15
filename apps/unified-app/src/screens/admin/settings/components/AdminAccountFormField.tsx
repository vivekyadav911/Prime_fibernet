import { useState } from 'react';
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';

import { FormField } from '@/components/admin';

import { formStyles } from '../adminAccountFormStyles';
import { ui } from '../adminAccountUi';

type AdminAccountFormFieldProps = TextInputProps & {
  label: string;
  error?: string;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  readOnly?: boolean;
};

export function AdminAccountFormField({
  style,
  containerStyle,
  error,
  readOnly = false,
  editable = true,
  onFocus,
  onBlur,
  ...props
}: AdminAccountFormFieldProps) {
  const [focused, setFocused] = useState(false);
  const isReadOnly = readOnly || editable === false;

  return (
    <FormField
      {...props}
      editable={!isReadOnly}
      error={error}
      placeholderTextColor={ui.textSecondary}
      containerStyle={[formStyles.fieldWrap, containerStyle]}
      style={[
        formStyles.input,
        isReadOnly ? formStyles.inputReadOnly : null,
        focused && !error && !isReadOnly ? formStyles.inputFocused : null,
        style,
      ]}
      onFocus={(e) => {
        if (!isReadOnly) setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
    />
  );
}
