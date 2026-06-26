import { StyleSheet, Text } from 'react-native';
import React from 'react';

import { signalGlass } from '@/theme/customer/signalGlass';

type TabIconProps = {
  label: string;
  focused: boolean;
};

export const TabIcon = React.memo(function TabIcon({ label, focused }: TabIconProps) {
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

const styles = StyleSheet.create({
  icon: { fontSize: 18, minWidth: 44, minHeight: 44, textAlign: 'center', lineHeight: 44 },
  focused: { opacity: 1, color: signalGlass.colors.accentPrimary },
  unfocused: { opacity: 0.5, color: signalGlass.colors.textMuted },
});
