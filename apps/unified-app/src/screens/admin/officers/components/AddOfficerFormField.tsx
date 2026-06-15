import { useState } from 'react';
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';

import { FormField } from '@/components/admin';

import { formStyles } from '../addOfficerFormStyles';

type AddOfficerFormFieldProps = TextInputProps & {
  label: string;
  error?: string;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function AddOfficerFormField({
  style,
  containerStyle,
  error,
  onFocus,
  onBlur,
  ...props
}: AddOfficerFormFieldProps) {
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
