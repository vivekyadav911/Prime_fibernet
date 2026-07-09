import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type ModalSheetHeaderProps = {
  title: string;
  onCancel: () => void;
  onDone?: () => void;
  doneLabel?: string;
  cancelLabel?: string;
  doneDisabled?: boolean;
  /** Bottom sheets should not add status-bar inset above the title row. */
  variant?: 'fullscreen' | 'sheet';
};

export function ModalSheetHeader({
  title,
  onCancel,
  onDone,
  doneLabel = 'Done',
  cancelLabel = 'Cancel',
  doneDisabled = false,
  variant = 'fullscreen',
}: ModalSheetHeaderProps) {
  const insets = useSafeAreaInsets();
  const isSheet = variant === 'sheet';

  return (
    <View
      style={[
        styles.wrapper,
        isSheet ? styles.wrapperSheet : { paddingTop: insets.top + spacing.xs },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          onPress={onCancel}
          style={styles.sideBtn}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          accessibilityRole="button"
          accessibilityLabel={cancelLabel}
        >
          <Text style={styles.sideText}>{cancelLabel}</Text>
        </Pressable>

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {onDone ? (
          <Pressable
            onPress={onDone}
            disabled={doneDisabled}
            style={styles.sideBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel={doneLabel}
          >
            <Text style={[styles.sideText, doneDisabled && styles.disabledText]}>{doneLabel}</Text>
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
  wrapperSheet: {
    paddingTop: spacing.sm,
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
  sideText: {
    fontSize: 16,
    color: adminColors.primary,
    fontWeight: '600',
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
