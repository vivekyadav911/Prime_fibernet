import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatBubble, ChatInputBar, CsatModal } from '@/components/support';
import { DismissKeyboardFlatList } from '@/components/common';
import { CustomerErrorState, CustomerSkeletonLoader } from '@/components/customer/ui';
import { useChatMessages } from '@/hooks/useChatSession';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import {
  createChatSession,
  sendChatMessage,
  submitChatCsat,
} from '@/services/chatService';
import { useAppSelector } from '@/store/hooks';
import type { CustomerStackParamList } from '@/types/navigation';
import type { CustomerTheme } from '@/theme/customer';

type Props = NativeStackScreenProps<CustomerStackParamList, 'CustomerLiveChat'>;

export function CustomerLiveChatScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const user = useAppSelector((s) => s.auth.user);
  const [sessionId, setSessionId] = useState(route.params?.sessionId ?? '');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showCsat, setShowCsat] = useState(false);
  const [queueMsg, setQueueMsg] = useState<string | null>(null);
  const [starting, setStarting] = useState(!route.params?.sessionId);
  const [startError, setStartError] = useState<string | null>(null);
  const { messages } = useChatMessages(sessionId || null);

  useEffect(() => {
    if (sessionId || !user) return;
    const start = async () => {
      setStarting(true);
      setStartError(null);
      try {
        const session = await createChatSession({
          customerId: user.id,
          customerName: user.name,
          channel: 'app',
        });
        setSessionId(session.id);
        if (session.status === 'waiting') {
          setQueueMsg('You are in queue. An agent will join shortly.');
        } else if (session.agentName) {
          setQueueMsg(`${session.agentName} joined the chat.`);
        }
      } catch (e) {
        setStartError(e instanceof Error ? e.message : 'Could not start chat');
      } finally {
        setStarting(false);
      }
    };
    void start();
  }, [sessionId, user]);

  const handleSend = useCallback(async () => {
    if (!text.trim() || !user || !sessionId) return;
    setSending(true);
    try {
      await sendChatMessage({
        sessionId,
        senderType: 'customer',
        senderId: user.id,
        senderName: user.name,
        message: text.trim(),
      });
      setText('');
      setQueueMsg(null);
    } finally {
      setSending(false);
    }
  }, [text, user, sessionId]);

  const retryStart = useCallback(() => {
    setStartError(null);
    setStarting(true);
    void createChatSession({
      customerId: user?.id ?? null,
      customerName: user?.name ?? 'Customer',
      channel: 'app',
    })
      .then((session) => {
        setSessionId(session.id);
        setStarting(false);
      })
      .catch((e) => {
        setStartError(e instanceof Error ? e.message : 'Could not start chat');
        setStarting(false);
      });
  }, [user?.id, user?.name]);

  if (starting) {
    return (
      <View style={styles.canvas}>
        <CustomerSkeletonLoader rows={4} />
      </View>
    );
  }

  if (startError) {
    return (
      <View style={styles.canvas}>
        <CustomerErrorState message={startError} onRetry={retryStart} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.canvas}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 56 : 0}
    >
      <View style={styles.container}>
        {queueMsg ? (
          <View style={styles.queueBanner}>
            <Text style={styles.queueText}>{queueMsg}</Text>
          </View>
        ) : null}

        <DismissKeyboardFlatList
          style={styles.list}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          renderItem={({ item }) => (
            <ChatBubble message={item} isOwn={item.senderType === 'customer'} />
          )}
        />

        <View style={{ paddingBottom: insets.bottom }}>
          <ChatInputBar value={text} onChangeText={setText} onSend={() => void handleSend()} sending={sending} />
        </View>
      </View>

      <CsatModal
        visible={showCsat}
        title="How was your chat experience?"
        onSubmit={(score, comment) => {
          void submitChatCsat(sessionId, score, comment);
          setShowCsat(false);
          navigation.goBack();
        }}
        onDismiss={() => {
          setShowCsat(false);
          navigation.goBack();
        }}
      />
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    canvas: { flex: 1, backgroundColor: theme.colors.bgDeep },
    container: { flex: 1 },
    list: { flex: 1 },
    queueBanner: {
      backgroundColor: theme.colors.accentPrimaryMuted,
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSubtle,
    },
    queueText: { fontSize: 13, color: theme.colors.textPrimary, textAlign: 'center' },
    messages: { padding: theme.spacing.lg, flexGrow: 1 },
  });
