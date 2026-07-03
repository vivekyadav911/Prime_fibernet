import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  CustomerBadge,
  CustomerButton,
  CustomerEmptyState,
  CustomerErrorState,
  CustomerSkeletonLoader,
  PressableScale,
} from '@/components/customer/ui';
import { CustomerTicketTimeline } from '@/components/customer/tickets/CustomerTicketTimeline';
import { CustomerFontProvider } from '@/components/customer/CustomerFontProvider';
import { DismissKeyboardFlatList } from '@/components/common';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useGetMyTicketsQuery } from '@/services/api/customerTicketsApi';
import type { CustomerStackParamList } from '@/types/navigation';
import type { CustomerTheme } from '@/theme/customer';
import { formatRelativeIst } from '@/utils/formatDate';

type Props = NativeStackScreenProps<CustomerStackParamList, 'CustomerTicketList'>;

function formatSubmittedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusTone(status: string): 'info' | 'success' | 'warning' {
  if (status === 'Resolved' || status === 'Closed') return 'success';
  if (status === 'Awaiting Customer' || status === 'Awaiting Parts') return 'warning';
  return 'info';
}

function TicketListContent({ navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const { data, isLoading, error, refetch, isFetching } = useGetMyTicketsQuery();

  if (isLoading) {
    return (
      <View style={styles.canvas}>
        <CustomerSkeletonLoader rows={4} rowHeight={160} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.canvas}>
        <CustomerErrorState message="Could not load tickets. Try again." onRetry={refetch} />
      </View>
    );
  }

  return (
    <View style={styles.canvas}>
      <CustomerButton
        label="Raise a Ticket"
        onPress={() => navigation.navigate('CreateCustomerTicket')}
        style={styles.cta}
      />
      <DismissKeyboardFlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={isFetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <CustomerEmptyState
            title="No tickets yet"
            subtitle="Raise a ticket if you need help with your connection or bill"
            actionLabel="Raise a Ticket"
            onAction={() => navigation.navigate('CreateCustomerTicket')}
            icon="🎫"
          />
        }
        renderItem={({ item }) => (
          <PressableScale
            style={styles.cardWrap}
            onPress={() => navigation.navigate('CustomerTicketDetail', { ticketId: item.id })}
            accessibilityLabel={`Ticket ${item.ticketNumber}`}
          >
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.number}>#{item.ticketNumber}</Text>
                <CustomerBadge label={item.status} tone={statusTone(item.status)} />
              </View>
              <Text style={styles.subject} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.submitted}>Submitted: {formatSubmittedDate(item.createdAt)}</Text>
              <CustomerTicketTimeline items={item.timeline} compact />
              <Text style={styles.viewDetails}>View Details →</Text>
            </View>
          </PressableScale>
        )}
      />
    </View>
  );
}

export function CustomerTicketListScreen(props: Props) {
  return (
    <CustomerFontProvider>
      <TicketListContent {...props} />
    </CustomerFontProvider>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    canvas: { flex: 1, backgroundColor: theme.colors.bgDeep, padding: theme.spacing.lg },
    cta: { marginBottom: theme.spacing.md },
    list: { paddingBottom: theme.spacing.xxxl },
    cardWrap: { marginBottom: theme.spacing.sm },
    card: {
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      gap: theme.spacing.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    number: {
      fontFamily: theme.fonts.mono,
      color: theme.colors.accentGlow,
      fontSize: 12,
      flex: 1,
    },
    subject: {
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.bodySemiBold,
      fontSize: 16,
    },
    submitted: {
      ...theme.typography.caption,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
    },
    viewDetails: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      fontFamily: theme.fonts.bodySemiBold,
      textAlign: 'right',
      marginTop: theme.spacing.xs,
    },
  });
