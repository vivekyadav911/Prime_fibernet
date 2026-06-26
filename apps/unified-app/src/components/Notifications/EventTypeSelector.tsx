import { useState } from 'react';
import { Keyboard, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DismissKeyboardFlatList } from '@/components/common';

import type { EventType } from '@/types/notifications';
import { EVENT_TYPE_OPTIONS } from '@/types/notifications';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type EventTypeSelectorProps = {
  value: EventType;
  onChange: (value: EventType) => void;
};

export function EventTypeSelector({ value, onChange }: EventTypeSelectorProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = EVENT_TYPE_OPTIONS.find((o) => o.value === value);

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
        <Text style={styles.triggerText}>{selected?.label ?? 'Select event type'}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={[styles.backdrop, { paddingTop: insets.top }]}
          onPress={() => {
            Keyboard.dismiss();
            setOpen(false);
          }}
        >
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.header}>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              >
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
              <Text style={styles.title}>Event Type</Text>
              <View style={styles.headerSpacer} />
            </View>
            <DismissKeyboardFlatList
              data={EVENT_TYPE_OPTIONS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.option, value === item.value && styles.optionActive]}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Ionicons
                    name={item.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={value === item.value ? adminColors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.optionText, value === item.value && styles.optionTextActive]}>
                    {item.label}
                  </Text>
                  {value === item.value ? (
                    <Ionicons name="checkmark" size={20} color={adminColors.primary} />
                  ) : null}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  triggerText: { flex: 1, fontSize: 15, color: colors.textPrimary },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  cancel: { color: colors.textSecondary, fontSize: 15 },
  title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  headerSpacer: { width: 50 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionActive: { backgroundColor: adminColors.primaryTint },
  optionText: { flex: 1, fontSize: 15, color: colors.textPrimary },
  optionTextActive: { fontWeight: '600', color: adminColors.primary },
});
