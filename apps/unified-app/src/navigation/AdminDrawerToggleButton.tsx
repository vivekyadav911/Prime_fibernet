import { Pressable, StyleSheet, View } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type AdminDrawerToggleButtonProps = {
  tintColor?: string;
};

export function AdminDrawerToggleButton({
  tintColor = colors.white,
}: AdminDrawerToggleButtonProps) {
  const navigation = useNavigation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open navigation menu"
      onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
      style={styles.button}
      hitSlop={8}
    >
      <View style={[styles.bar, { backgroundColor: tintColor }]} />
      <View style={[styles.bar, { backgroundColor: tintColor }]} />
      <View style={[styles.bar, { backgroundColor: tintColor }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginLeft: spacing.md,
    paddingVertical: spacing.xs,
    paddingRight: spacing.xs,
    gap: 4,
  },
  bar: {
    width: 20,
    height: 2,
    borderRadius: 1,
  },
});
