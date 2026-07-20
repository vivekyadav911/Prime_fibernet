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

import {KeyboardDismissView, ErrorState, SkeletonLoader} from '@/components/common';
import { OfficerScreenWrapper } from '@/components/officer';
import { useOfficerProfile, useOfficerPullToRefresh } from '@/hooks/officer';
import { useKeyboardVerticalOffset } from '@/hooks/useKeyboardVerticalOffset';
import { useAppSelector } from '@/store/hooks';
import {
  fetchChatMessages,
  fetchOrCreateOfficerSupportSession,
  sendChatMessage,
  subscribeToChatMessages,
} from '@/services/chatService';
import type { ChatMessage } from '@/types/support';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

function senderLabel(message: ChatMessage, isMe: boolean): string {
  if (isMe) return 'You';
  if (message.senderType === 'agent') return `Support · ${message.senderName}`;
  if (message.senderType === 'customer') return message.senderName;
  if (message.senderType === 'system') return 'System';
  return message.senderName;
}

function ChatBubble({ message, isMe }: { message: ChatMessage; isMe: boolean }) {
  return (
    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
      <Text style={[styles.sender, isMe && styles.senderMe]}>{senderLabel(message, isMe)}</Text>
      <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{message.message}</Text>
    </View>
  );
}

/**
 * Internal officer ↔ dispatch/support channel (not customer ticket threads).
 */
export function OfficerSupportChatScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { profile } = useOfficerProfile();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const session = await fetchOrCreateOfficerSupportSession(
          user.id,
          profile?.name ?? user.name ?? 'Officer',
        );
        if (cancelled) return;
        setSessionId(session.id);
        const initial = await fetchChatMessages(session.id);
        if (!cancelled) setMessages(initial);
      } catch (err) {
        if (!cancelled) {
          setSessionError((err as Error).message ?? 'Could not start chat session.');
        }
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

  const reloadMessages = useCallback(async () => {
    if (!sessionId) return;
    const initial = await fetchChatMessages(sessionId);
    setMessages(initial);
  }, [sessionId]);
  const { refreshControl } = useOfficerPullToRefresh(reloadMessages);

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

  const keyboardOffset = useKeyboardVerticalOffset();

  if (loading) {
    return (
      <OfficerScreenWrapper scrollable={false}>
        <SkeletonLoader rows={6} />
      </OfficerScreenWrapper>
    );
  }

  if (sessionError) {
    return (
      <OfficerScreenWrapper scrollable={false}>
        <ErrorState
          message={sessionError}
          onRetry={() => {
            setSessionError(null);
            setLoading(true);
          }}
        />
      </OfficerScreenWrapper>
    );
  }

  return (
    <OfficerScreenWrapper scrollable={false} padded={false} keyboardAvoiding={false}>
      <KeyboardDismissView style={styles.flex}>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Internal support chat with dispatch — not customer ticket threads.
          </Text>
        </View>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={keyboardOffset}
        >
          <FlatList
            ref={listRef}
            refreshControl={refreshControl}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => (
              <ChatBubble
                message={item}
                isMe={item.senderType === 'customer' && item.senderId === user?.id}
              />
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>No messages yet — say hello to dispatch.</Text>
            }
          />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Message dispatch…"
              placeholderTextColor={colors.textSecondary}
            />
            <Button label={sending ? '…' : 'Send'} onPress={() => void onSend()} disabled={sending} />
          </View>
        </KeyboardAvoidingView>
      </KeyboardDismissView>
    </OfficerScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bannerText: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
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
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceWhite,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  sender: { fontSize: 11, color: colors.textSecondary, marginBottom: 2, fontWeight: '600' },
  senderMe: { color: 'rgba(255,255,255,0.8)' },
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
