import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { ChatBubble, ChatInputBar, CsatModal, CustomerQuickInfo } from '@/components/support';
import { RoleGuard } from '@/components/admin';
import { useChatMessages } from '@/hooks/useChatSession';
import {
  endChatSession,
  linkChatToTicket,
  sendChatMessage,
  submitChatCsat,
} from '@/services/chatService';
import { useGetCannedResponsesQuery, useGetChatSessionsQuery } from '@/services/api/adminSupportApi';
import { useAppSelector } from '@/store/hooks';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminSupportStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<AdminSupportStackParamList, 'ChatConversation'>;

export function ChatConversationScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showCsat, setShowCsat] = useState(false);
  const user = useAppSelector((s) => s.auth.user);
  const { messages } = useChatMessages(sessionId);
  const { data: sessions } = useGetChatSessionsQuery();
  const { data: canned } = useGetCannedResponsesQuery();

  const session = sessions?.find((s) => s.id === sessionId);

  const handleSend = useCallback(async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    try {
      await sendChatMessage({
        sessionId,
        senderType: 'agent',
        senderId: user.id,
        senderName: user.name,
        message: text.trim(),
      });
      setText('');
    } finally {
      setSending(false);
    }
  }, [text, user, sessionId]);

  const handleEnd = useCallback(() => {
    Alert.alert('End Chat', 'End this conversation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End',
        onPress: async () => {
          await endChatSession(sessionId);
          setShowCsat(true);
        },
      },
    ]);
  }, [sessionId]);

  const handleRaiseTicket = useCallback(() => {
    navigation.navigate('CreateTicket', {
      linkedRequestId: undefined,
    });
    if (session) {
      void linkChatToTicket(sessionId, '');
    }
  }, [navigation, session, sessionId]);

  const listHeader = useMemo(() => {
    if (!session) return null;
    return (
      <View style={styles.topBar}>
        <CustomerQuickInfo
          name={session.customerName}
          accountNumber={session.accountNumber}
          phone={session.customerPhone}
          onViewProfile={
            session.customerId
              ? () => navigation.navigate('CustomerSupportProfile', { customerId: session.customerId! })
              : undefined
          }
        />
        <View style={styles.actions}>
          <Pressable style={styles.actionBtn} onPress={handleRaiseTicket}>
            <Text style={styles.actionText}>Raise Ticket</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, styles.endBtn]} onPress={handleEnd}>
            <Text style={[styles.actionText, styles.endText]}>End Chat</Text>
          </Pressable>
        </View>
      </View>
    );
  }, [session, navigation, handleRaiseTicket, handleEnd]);

  return (
    <RoleGuard requiredPermission="settings.view">
      <Screen style={adminScreenStyles.canvas} padded={false} safeAreaTop={false}>
        <View style={styles.container}>
          <FlatList
            style={styles.list}
            data={messages}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={listHeader}
            contentContainerStyle={styles.messages}
            renderItem={({ item }) => (
              <ChatBubble message={item} isOwn={item.senderType === 'agent'} />
            )}
          />

          <ChatInputBar
            value={text}
            onChangeText={setText}
            onSend={() => void handleSend()}
            cannedResponses={canned}
            sending={sending}
          />
        </View>

        <CsatModal
          visible={showCsat}
          title="Request CSAT from customer"
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
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  topBar: {
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    backgroundColor: adminColors.canvasBg,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.surfaceWhite,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  endBtn: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  actionText: { fontSize: 13, fontWeight: '600', color: adminColors.primary },
  endText: { color: adminColors.badgeDanger },
  messages: { padding: spacing.md, flexGrow: 1 },
});
