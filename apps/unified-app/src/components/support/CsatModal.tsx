import { useState } from 'react';
import { Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@prime/ui';
import { KeyboardDismissView } from '@/components/common';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type CsatModalProps = {
  visible: boolean;
  title?: string;
  onSubmit: (score: number, comment?: string) => void;
  onDismiss: () => void;
};

export function CsatModal({ visible, title = 'Rate your experience', onSubmit, onDismiss }: CsatModalProps) {
  const insets = useSafeAreaInsets();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (score < 1) return;
    onSubmit(score, comment.trim() || undefined);
    setScore(0);
    setComment('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable
        style={[styles.backdrop, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        onPress={() => {
          Keyboard.dismiss();
          onDismiss();
        }}
      >
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <KeyboardDismissView>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setScore(n)} hitSlop={8}>
                  <Text style={[styles.star, score >= n && styles.starActive]}>★</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.input}
              value={comment}
              onChangeText={setComment}
              placeholder="Optional feedback…"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <View style={styles.actions}>
              <Button label="Skip" variant="ghost" onPress={onDismiss} />
              <Button label="Submit" onPress={handleSubmit} />
            </View>
          </KeyboardDismissView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.surfaceWhite, borderRadius: 16, padding: spacing.xl },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.md },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.md },
  star: { fontSize: 36, color: colors.borderDefault },
  starActive: { color: adminColors.badgeWarning },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 8,
    padding: spacing.sm,
    minHeight: 80,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
});
