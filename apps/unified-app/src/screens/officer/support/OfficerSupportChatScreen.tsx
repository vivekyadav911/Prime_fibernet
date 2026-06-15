import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '@prime/ui';

import { ScreenWrapper, SkeletonLoader } from '@/components/common';
import { useOfficerProfile } from '@/hooks/officer';
import { useAppSelector } from '@/store/hooks';
import {
  createChatSession,
  fetchChatMessages,
  sendChatMessage,
  subscribeToChatMessages,
} from '@/services/chatService';
import type { ChatMessage } from '@/types/support';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

function ChatBubble({ message, isMe }: { message: ChatMessage; isMe: boolean }) {
  return (
    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleAgent]}>
      {!isMe ? <Text style={styles.sender}>{message.senderName}</Text> : null}
      <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{message.message}</Text>
    </View>
  );
}

export function OfficerSupportChatScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { profile } = useOfficerProfile();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const session = await createChatSession({
          customerId: user.id,
          customerName: profile?.name ?? user.name ?? 'Officer',
          channel: 'officer_app',
        });
        if (cancelled) return;
        setSessionId(session.id);
        const initial = await fetchChatMessages(session.id);
        if (!cancelled) setMessages(initial);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.name, user]);

  useEffect(() => {
    if (!sessionId) return;
    const channel = subscribeToChatMessages(sessionId, (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => {
      channel.unsubscribe();
    };
  }, [sessionId]);

  const onSend = useCallback(async () => {
    const text = draft.trim();
    if (!sessionId || !user || !text) return;
    setSending(true);
    try {
      await sendChatMessage({
        sessionId,
        senderType: 'customer',
        senderId: user.id,
        senderName: profile?.name ?? user.name ?? 'Officer',
        message: text,
      });
      setDraft('');
    } finally {
      setSending(false);
    }
  }, [draft, profile?.name, sessionId, user]);

  if (loading) {
    return (
      <ScreenWrapper scrollable={false}>
        <SkeletonLoader rows={6} />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <ChatBubble message={item} isMe={item.senderType === 'customer'} />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>Chat started — an agent will join shortly.</Text>
          }
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message…"
            placeholderTextColor={colors.textSecondary}
          />
          <Button label={sending ? '…' : 'Send'} onPress={() => void onSend()} disabled={sending} />
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: spacing.md, paddingBottom: spacing.sm },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl },
  bubble: {
    maxWidth: '82%',
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primaryNavy,
  },
  bubbleAgent: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceWhite,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  sender: { fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
  bubbleText: { color: colors.textPrimary, fontSize: 15 },
  bubbleTextMe: { color: colors.white },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    minHeight: 48,
    color: colors.textPrimary,
  },
});
