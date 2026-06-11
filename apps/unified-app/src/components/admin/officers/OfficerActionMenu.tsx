import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export type OfficerMenuAction = {
  key: string;
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

type OfficerActionMenuProps = {
  visible: boolean;
  onClose: () => void;
  actions: OfficerMenuAction[];
};

export function OfficerActionMenu({ visible, onClose, actions }: OfficerActionMenuProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheet}>
          {actions.map((action) => (
            <Pressable
              key={action.key}
              style={styles.item}
              onPress={() => {
                onClose();
                action.onPress();
              }}
            >
              <Text
                style={[
                  styles.itemText,
                  action.destructive ? styles.destructive : undefined,
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
          <Pressable style={[styles.item, styles.cancelItem]} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: adminColors.cardBg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  item: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderDefault,
  },
  itemText: { fontSize: 16, color: colors.textPrimary, fontWeight: '500' },
  destructive: { color: adminColors.deleteIcon },
  cancelItem: { borderBottomWidth: 0, marginTop: spacing.xs },
  cancelText: { fontSize: 16, color: adminColors.primary, fontWeight: '600', textAlign: 'center' },
});
