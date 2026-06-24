import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { CustomerButton, CustomerInput, CustomerSkeletonLoader } from '@/components/customer/ui';
import { CustomerFontProvider } from '@/components/customer/CustomerFontProvider';
import { ErrorState } from '@/components/common';
import {
  useGetTicketMessagesQuery,
  useSendTicketReplyMutation,
} from '@/services/api/customerTicketsApi';
import { signalGlass } from '@/theme/customer/signalGlass';
import type { CustomerStackParamList } from '@/types/navigation';
import { formatRelativeIst } from '@/utils/formatDate';

type Props = NativeStackScreenProps<CustomerStackParamList, 'CustomerTicketDetail'>;

function TicketDetailContent({ route }: Props) {
  const { ticketId } = route.params;
  const { data: messages, isLoading, error, refetch } = useGetTicketMessagesQuery(ticketId);
  const [sendReply, { isLoading: sending }] = useSendTicketReplyMutation();
  const [text, setText] = useState('');

  const onSend = async () => {
    if (!text.trim()) return;
    await sendReply({ ticketId, message: text.trim() }).unwrap();
    setText('');
  };

  if (isLoading) {
    return (
      <View style={styles.canvas}>
        <CustomerSkeletonLoader rows={4} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.canvas}>
        <ErrorState message="Could not load messages" onRetry={refetch} />
      </View>
    );
  }

  return (
    <View style={styles.canvas}>
      <FlatList
        data={messages ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.senderType === 'customer' ? styles.customerBubble : styles.agentBubble,
            ]}
          >
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.time}>{formatRelativeIst(item.createdAt)}</Text>
          </View>
        )}
      />
      <View style={styles.composer}>
        <CustomerInput
          value={text}
          onChangeText={setText}
          placeholder="Write a reply..."
          style={styles.input}
        />
        <CustomerButton
          label={sending ? 'Sending...' : 'Send'}
          onPress={() => void onSend()}
          disabled={sending || !text.trim()}
        />
      </View>
    </View>
  );
}

export function CustomerTicketDetailScreen(props: Props) {
  return (
    <CustomerFontProvider>
      <TicketDetailContent {...props} />
    </CustomerFontProvider>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: signalGlass.colors.bgDeep },
  list: { padding: signalGlass.spacing.lg, paddingBottom: 120 },
  bubble: {
    maxWidth: '85%',
    borderRadius: signalGlass.radius.md,
    padding: signalGlass.spacing.md,
    marginBottom: signalGlass.spacing.sm,
  },
  customerBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(59,130,246,0.35)',
  },
  agentBubble: {
    alignSelf: 'flex-start',
    backgroundColor: signalGlass.colors.bgGlass,
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
  },
  message: { color: signalGlass.colors.textPrimary, fontSize: 14 },
  time: { color: signalGlass.colors.textMuted, fontSize: 10, marginTop: 4 },
  composer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: signalGlass.spacing.lg,
    backgroundColor: signalGlass.colors.bgSurface,
    borderTopWidth: 1,
    borderTopColor: signalGlass.colors.borderSubtle,
    gap: signalGlass.spacing.sm,
  },
  input: { marginBottom: 0 },
});
