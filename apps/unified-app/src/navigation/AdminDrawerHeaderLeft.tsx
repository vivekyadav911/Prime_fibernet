import { Platform, Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackHeaderBackProps } from '@react-navigation/native-stack';

import { spacing } from '@/theme/spacing';

import { AdminDrawerToggleButton } from './AdminDrawerToggleButton';

export function AdminDrawerHeaderLeft({ tintColor, canGoBack }: NativeStackHeaderBackProps) {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isWebSidebar = Platform.OS === 'web' && width >= 1024;

  if (canGoBack) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => navigation.goBack()}
        style={styles.backButton}
        hitSlop={8}
      >
        <Text style={[styles.backIcon, { color: tintColor }]}>‹</Text>
      </Pressable>
    );
  }

  if (isWebSidebar) {
    return null;
  }

  return <AdminDrawerToggleButton tintColor={tintColor} />;
}

const styles = StyleSheet.create({
  backButton: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  backIcon: {
    fontSize: 32,
    lineHeight: 32,
    fontWeight: '300',
  },
});
