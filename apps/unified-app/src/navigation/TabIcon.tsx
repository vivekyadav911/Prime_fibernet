import { StyleSheet, Text } from 'react-native';
import React from 'react';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

type TabIconProps = {
  label: string;
  focused: boolean;
};

export const TabIcon = React.memo(function TabIcon({ label, focused }: TabIconProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <Text
      style={[styles.icon, focused ? styles.focused : styles.unfocused]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {label}
    </Text>
  );
});

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    icon: { fontSize: 18, minWidth: 44, minHeight: 44, textAlign: 'center', lineHeight: 44 },
    focused: { opacity: 1, color: theme.colors.accentPrimary },
    unfocused: { opacity: 0.5, color: theme.colors.textMuted },
  });
