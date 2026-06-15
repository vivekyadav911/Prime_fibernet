import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { ChatBubble, ChatInputBar, CsatModal } from '@/components/support';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useChatMessages } from '@/hooks/useChatSession';
import {
  createChatSession,
  endChatSession,
  sendChatMessage,
  submitChatCsat,
} from '@/services/chatService';
import { useAppSelector } from '@/store/hooks';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { CustomerStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<CustomerStackParamList, 'CustomerLiveChat'>;

export function CustomerLiveChatScreen({ route, navigation }: Props) {
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

  const handleEnd = useCallback(async () => {
    if (!sessionId) return;
    await endChatSession(sessionId);
    setShowCsat(true);
  }, [sessionId]);

  if (starting) {
    return (
      <Screen style={styles.screen}>
        <SkeletonLoader rows={4} />
      </Screen>
    );
  }

  if (startError) {
    return (
      <Screen style={styles.screen}>
        <ErrorState
          message={startError}
          onRetry={() => {
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
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen} padded={false} safeAreaTop={false}>
      <View style={styles.container}>
        {queueMsg ? (
          <View style={styles.queueBanner}>
            <Text style={styles.queueText}>{queueMsg}</Text>
          </View>
        ) : null}

        <FlatList
          style={styles.list}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          renderItem={({ item }) => (
            <ChatBubble message={item} isOwn={item.senderType === 'customer'} />
          )}
        />

        <ChatInputBar value={text} onChangeText={setText} onSend={() => void handleSend()} sending={sending} />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  list: { flex: 1 },
  queueBanner: { backgroundColor: '#FEF3C7', padding: spacing.md },
  queueText: { fontSize: 13, color: colors.textPrimary, textAlign: 'center' },
  messages: { padding: spacing.md, flexGrow: 1 },
});
