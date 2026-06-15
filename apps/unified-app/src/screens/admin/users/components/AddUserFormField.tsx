import { useState } from 'react';
import type { StyleProp, TextStyle, TextInputProps, ViewStyle } from 'react-native';

import { FormField } from '@/components/admin';

import { formStyles } from '../addUserFormStyles';

type AddUserFormFieldProps = TextInputProps & {
  label: string;
  error?: string;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function AddUserFormField({
  style,
  containerStyle,
  error,
  onFocus,
  onBlur,
  ...props
}: AddUserFormFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <FormField
      {...props}
      error={error}
      containerStyle={[formStyles.fieldWrap, containerStyle]}
      style={[
        formStyles.input,
        focused && !error ? formStyles.inputFocused : null,
        error ? formStyles.inputError : null,
        style,
      ]}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
    />
  );
}
