import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

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
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + spacing.xs }]}>
      <View style={styles.row}>
        <Pressable
          onPress={onBack}
          style={styles.sideBtn}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {rightAction ? (
          <Pressable
            onPress={rightAction.onPress}
            disabled={rightAction.disabled}
            style={styles.sideBtn}
            hitSlop={8}
          >
            <Text style={[styles.rightText, rightAction.disabled && styles.disabledText]}>
              {rightAction.label}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.sideBtn} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surfaceWhite,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderDefault,
    zIndex: 10,
    elevation: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sideBtn: {
    minWidth: 72,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  backText: {
    fontSize: 16,
    color: adminColors.primary,
    fontWeight: '600',
  },
  rightText: {
    fontSize: 16,
    color: adminColors.primary,
    fontWeight: '600',
    textAlign: 'right',
  },
  disabledText: {
    opacity: 0.4,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: spacing.xxs,
  },
});
