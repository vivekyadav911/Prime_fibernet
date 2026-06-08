import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors } from '@prime/ui';

type TabIconProps = {
  label: string;
  focused: boolean;
};

export const TabIcon = React.memo(function TabIcon({ label, focused }: TabIconProps) {
  return <Text style={[styles.icon, focused ? styles.focused : styles.unfocused]}>{label}</Text>;
});

const styles = StyleSheet.create({
  icon: { fontSize: 18 },
  focused: { opacity: 1, color: colors.accentTeal },
  unfocused: { opacity: 0.5, color: colors.textSecondary },
});
