import { useCallback, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type SelectOption<T extends string> = {
  value: T;
  label: string;
};

type SelectFieldProps<T extends string> = {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onSelect: (value: T) => void;
  error?: string;
  placeholder?: string;
  containerStyle?: StyleProp<ViewStyle>;
  triggerStyle?: StyleProp<ViewStyle>;
  triggerTextStyle?: StyleProp<TextStyle>;
};

type MenuLayout = {
  top: number;
  left: number;
  width: number;
};

const MENU_MAX_HEIGHT = 220;
const MENU_GAP = 4;

export function SelectField<T extends string>({
  label,
  value,
  options,
  onSelect,
  error,
  placeholder = 'Select…',
  containerStyle,
  triggerStyle,
  triggerTextStyle,
}: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const [menuLayout, setMenuLayout] = useState<MenuLayout>({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<View>(null);
  const { height: windowHeight } = useWindowDimensions();
  const selected = options.find((o) => o.value === value)?.label;

  const closeMenu = useCallback(() => setOpen(false), []);

  const openMenu = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const spaceBelow = windowHeight - (y + height) - MENU_GAP;
      const openUpward = spaceBelow < MENU_MAX_HEIGHT && y > spaceBelow;
      const top = openUpward
        ? Math.max(spacing.sm, y - MENU_MAX_HEIGHT - MENU_GAP)
        : y + height + MENU_GAP;

      setMenuLayout({ top, left: x, width });
      setOpen(true);
    });
  }, [windowHeight]);

  const handleSelect = useCallback(
    (optionValue: T) => {
      onSelect(optionValue);
      setOpen(false);
    },
    [onSelect],
  );

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          style={[styles.trigger, triggerStyle, error ? styles.triggerError : null]}
          onPress={openMenu}
        >
          <Text style={[styles.triggerText, triggerTextStyle, !selected && styles.placeholder]}>
            {selected ?? placeholder}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
        statusBarTranslucent
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={closeMenu} accessibilityRole="button" />
          <View
            style={[
              styles.menu,
              {
                top: menuLayout.top,
                left: menuLayout.left,
                width: menuLayout.width,
                maxHeight: MENU_MAX_HEIGHT,
              },
            ]}
          >
            <ScrollView
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              bounces={options.length > 5}
            >
              {options.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.item, value === opt.value && styles.itemActive]}
                  onPress={() => handleSelect(opt.value)}
                >
                  <Text style={[styles.itemText, value === opt.value && styles.itemTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
    textTransform: 'uppercase',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceWhite,
  },
  triggerError: { borderColor: colors.errorRed },
  triggerText: { fontSize: 15, color: colors.textPrimary, flex: 1 },
  placeholder: { color: colors.textSecondary },
  modalRoot: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  menu: {
    position: 'absolute',
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
  },
  item: { padding: spacing.sm },
  itemActive: { backgroundColor: adminColors.primaryTint },
  itemText: { fontSize: 14, color: colors.textPrimary },
  itemTextActive: { color: adminColors.primary, fontWeight: '600' },
  error: { color: colors.errorRed, fontSize: 12, marginTop: spacing.xxs },
});
