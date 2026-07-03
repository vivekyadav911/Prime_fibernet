import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomerTicketTimeline } from '@/components/customer/tickets/CustomerTicketTimeline';
import {
  CustomerBadge,
  CustomerButton,
  CustomerErrorState,
  CustomerInput,
  CustomerSkeletonLoader,
} from '@/components/customer/ui';
import { CustomerFontProvider } from '@/components/customer/CustomerFontProvider';
import { DismissKeyboardFlatList } from '@/components/common';
import { useCustomerTicketRealtime } from '@/hooks/useCustomerTicketRealtime';
import { useGetCustomerProfileQuery } from '@/services/api/authApi';
import {
  useGetCustomerTicketDetailQuery,
  useGetTicketMessagesQuery,
  useSendTicketReplyMutation,
} from '@/services/api/customerTicketsApi';
import { useAppSelector } from '@/store/hooks';
import type { CustomerStackParamList } from '@/types/navigation';
import type { CustomerTheme } from '@/theme/customer';
import { formatRelativeIst } from '@/utils/formatDate';
import { useThemedStyles } from '@/hooks/useThemedStyles';

type Props = NativeStackScreenProps<CustomerStackParamList, 'CustomerTicketDetail'>;

function statusTone(status: string): 'info' | 'success' | 'warning' {
  if (status === 'Resolved' || status === 'Closed') return 'success';
  if (status === 'Awaiting Customer' || status === 'Awaiting Parts') return 'warning';
  return 'info';
}

function TicketDetailContent({ route }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const { ticketId } = route.params;
  const authUserId = useAppSelector((s) => s.auth.user?.id ?? '');
  const { data: profile } = useGetCustomerProfileQuery(undefined, { skip: !authUserId });

  const {
    data: ticket,
    isLoading: ticketLoading,
    error: ticketError,
    refetch: refetchTicket,
  } = useGetCustomerTicketDetailQuery(ticketId);
  const { data: messages, isLoading: messagesLoading, error: messagesError, refetch: refetchMessages } =
    useGetTicketMessagesQuery(ticketId);
  const [sendReply, { isLoading: sending }] = useSendTicketReplyMutation();
  const [text, setText] = useState('');

  useCustomerTicketRealtime({
    ticketId,
    customerUserId: profile?.id,
    enabled: Boolean(ticketId && profile?.id),
  });

  const onSend = async () => {
    if (!text.trim()) return;
    await sendReply({ ticketId, message: text.trim() }).unwrap();
    setText('');
  };

  const isLoading = ticketLoading || messagesLoading;
  const error = ticketError ?? messagesError;

  if (isLoading) {
    return (
      <View style={styles.canvas}>
        <CustomerSkeletonLoader rows={6} rowHeight={72} />
      </View>
    );
  }

  if (error || !ticket) {
    return (
      <View style={styles.canvas}>
        <CustomerErrorState
          message="Could not load ticket. Try again."
          onRetry={() => {
            void refetchTicket();
            void refetchMessages();
          }}
        />
      </View>
    );
  }

  const listHeader = (
    <View style={styles.headerBlock}>
      <View style={styles.headerRow}>
        <Text style={styles.ticketNumber}>#{ticket.ticketNumber}</Text>
        <CustomerBadge label={ticket.status} tone={statusTone(ticket.status)} />
      </View>
      <Text style={styles.title}>{ticket.title}</Text>
      <Text style={styles.meta}>Updated {formatRelativeIst(ticket.updatedAt)}</Text>
      <CustomerTicketTimeline items={ticket.timeline} />
      <Text style={styles.sectionTitle}>Conversation</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.canvas}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 56 : 0}
    >
      <DismissKeyboardFlatList
        style={styles.list}
        data={messages ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
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
      <View style={[styles.composer, { paddingBottom: insets.bottom + 12 }]}>
        <CustomerInput
          value={text}
          onChangeText={setText}
          placeholder="Write a reply..."
          style={styles.input}
        />
        <CustomerButton
          label={sending ? 'Sending…' : 'Send Reply'}
          onPress={() => void onSend()}
          disabled={sending || !text.trim()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

export function CustomerTicketDetailScreen(props: Props) {
  return (
    <CustomerFontProvider>
      <TicketDetailContent {...props} />
    </CustomerFontProvider>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    canvas: { flex: 1, backgroundColor: theme.colors.bgDeep },
    list: { flex: 1 },
    listContent: { padding: theme.spacing.lg },
    headerBlock: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSubtle,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    ticketNumber: {
      fontFamily: theme.fonts.mono,
      color: theme.colors.accentGlow,
      fontSize: 13,
    },
    title: {
      ...theme.typography.displayMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
    },
    meta: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.body,
    },
    sectionTitle: {
      ...theme.typography.bodyLg,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
      marginTop: theme.spacing.md,
    },
    bubble: {
      maxWidth: '85%',
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    customerBubble: {
      alignSelf: 'flex-end',
      backgroundColor: theme.colors.accentPrimaryMuted,
    },
    agentBubble: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.bgGlass,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
    },
    message: { color: theme.colors.textPrimary, fontSize: 14 },
    time: { color: theme.colors.textMuted, fontSize: 10, marginTop: 4 },
    composer: {
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.bgSurface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderSubtle,
      gap: theme.spacing.sm,
    },
    input: { marginBottom: 0 },
  });
