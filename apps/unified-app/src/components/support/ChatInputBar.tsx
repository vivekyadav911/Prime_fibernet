import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { CannedResponse } from '@/types/support';

type ChatInputBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  cannedResponses?: CannedResponse[];
  sending?: boolean;
};

export function ChatInputBar({
  value,
  onChangeText,
  onSend,
  cannedResponses = [],
  sending,
}: ChatInputBarProps) {
  const [showCanned, setShowCanned] = useState(false);

  const filteredCanned = useMemo(() => {
    if (!value.startsWith('#')) return [];
    const q = value.slice(1).toLowerCase();
    return cannedResponses.filter(
      (c) =>
        c.isActive &&
        (c.shortcut?.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)),
    );
  }, [value, cannedResponses]);

  const handleSelectCanned = (item: CannedResponse) => {
    onChangeText(item.body);
    setShowCanned(false);
  };

  return (
    <View style={styles.wrap}>
      {filteredCanned.length > 0 ? (
        <View style={styles.cannedList}>
          {filteredCanned.slice(0, 5).map((item) => (
            <Pressable key={item.id} style={styles.cannedItem} onPress={() => handleSelectCanned(item)}>
              <Text style={styles.cannedShortcut}>{item.shortcut}</Text>
              <Text style={styles.cannedTitle} numberOfLines={1}>
                {item.title}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.bar}>
        <Pressable onPress={() => setShowCanned(true)} hitSlop={8}>
          <Ionicons name="flash" size={22} color={adminColors.primary} />
        </Pressable>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder="Type a message… (# for shortcuts)"
          placeholderTextColor={colors.textSecondary}
          multiline
        />
        <Pressable style={[styles.sendBtn, sending && styles.sendDisabled]} onPress={onSend} disabled={sending || !value.trim()}>
          <Ionicons name="send" size={18} color={colors.white} />
        </Pressable>
      </View>

      <Modal visible={showCanned} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setShowCanned(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Quick Responses</Text>
            <FlatList
              data={cannedResponses.filter((c) => c.isActive)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable style={styles.cannedItem} onPress={() => handleSelectCanned(item)}>
                  <Text style={styles.cannedShortcut}>{item.shortcut ?? '—'}</Text>
                  <Text style={styles.cannedTitle}>{item.title}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: 1, borderTopColor: colors.borderDefault, backgroundColor: colors.surfaceWhite },
  cannedList: {
    maxHeight: 120,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  cannedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderDefault,
  },
  cannedShortcut: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '700',
    color: adminColors.primary,
    minWidth: 56,
  },
  cannedTitle: { flex: 1, fontSize: 13, color: colors.textPrimary },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: adminColors.canvasBg,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: adminColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.5 },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '50%',
    padding: spacing.md,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
});
