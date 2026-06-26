import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AdminAppBar } from '@/components/admin/AdminAppBar';
import { AdminHeaderButton, ADMIN_HEADER_ICON_SIZE } from '@/navigation/AdminHeaderButton';
import { adminHeaderTheme } from '@/theme/adminHeader';

type ViewerScreenHeaderProps = {
  title: string;
  onBack: () => void;
  rightAction?: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
  };
};

export function ViewerScreenHeader({ title, onBack, rightAction }: ViewerScreenHeaderProps) {
  return (
    <AdminAppBar
      title={title}
      headerLeft={
        <AdminHeaderButton accessibilityLabel="Go back" onPress={onBack}>
          <Ionicons name="chevron-back" size={ADMIN_HEADER_ICON_SIZE + 2} color={adminHeaderTheme.foreground} />
        </AdminHeaderButton>
      }
      headerRight={
        rightAction ? (
          <Pressable
            onPress={rightAction.onPress}
            disabled={rightAction.disabled}
            style={styles.rightAction}
            hitSlop={8}
          >
            <Text style={[styles.rightText, rightAction.disabled && styles.disabledText]}>
              {rightAction.label}
            </Text>
          </Pressable>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  rightAction: {
    minWidth: adminHeaderTheme.buttonSize,
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 2,
  },
  rightText: {
    fontSize: adminHeaderTheme.subtitleFontSize,
    fontWeight: '600',
    color: adminHeaderTheme.foreground,
  },
  disabledText: {
    opacity: 0.45,
  },
});
