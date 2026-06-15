import { StyleSheet, Text, View } from 'react-native';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { ChatMessage } from '@/types/support';

type ChatBubbleProps = {
  message: ChatMessage;
  isOwn: boolean;
};

export function ChatBubble({ message, isOwn }: ChatBubbleProps) {
  if (message.senderType === 'system') {
    return (
      <View style={styles.systemWrap}>
        <Text style={styles.systemText}>{message.message}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.row, isOwn && styles.rowOwn]}>
      <View style={[styles.bubble, isOwn ? styles.agentBubble : styles.customerBubble]}>
        {!isOwn ? <Text style={styles.senderName}>{message.senderName}</Text> : null}
        <Text style={[styles.messageText, isOwn && styles.agentText]}>{message.message}</Text>
        <Text style={[styles.time, isOwn && styles.agentTime]}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: spacing.sm },
  rowOwn: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  agentBubble: { backgroundColor: adminColors.primary, borderBottomRightRadius: 4 },
  customerBubble: { backgroundColor: colors.surfaceWhite, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.borderDefault },
  senderName: { fontSize: 10, fontWeight: '600', color: colors.textSecondary, marginBottom: 2 },
  messageText: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  agentText: { color: colors.white },
  time: { fontSize: 9, color: colors.textSecondary, marginTop: spacing.xxs, alignSelf: 'flex-end' },
  agentTime: { color: 'rgba(255,255,255,0.7)' },
  systemWrap: { alignItems: 'center', marginVertical: spacing.xs },
  systemText: { fontSize: 12, fontStyle: 'italic', color: colors.textSecondary },
});
