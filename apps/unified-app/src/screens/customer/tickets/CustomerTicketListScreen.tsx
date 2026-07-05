import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  CustomerButton,
  CustomerCard,
  CustomerEmptyState,
  CustomerErrorState,
  CustomerSkeletonLoader,
} from '@/components/customer/ui';
import { CustomerTicketStatusPill } from '@/components/customer/tickets/CustomerTicketStatusPill';
import { CustomerTicketTimeline } from '@/components/customer/tickets/CustomerTicketTimeline';
import { DismissKeyboardFlatList } from '@/components/common';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useGetMyTicketsQuery } from '@/services/api/customerTicketsApi';
import type { CustomerStackParamList } from '@/types/navigation';
import type { CustomerTheme } from '@/theme/customer';

type Props = NativeStackScreenProps<CustomerStackParamList, 'CustomerTicketList'>;

function formatSubmittedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function CustomerTicketListScreen({ navigation }: Props) {
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
        icon="plus-circle-outline"
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
          <CustomerCard
            style={styles.cardWrap}
            contentStyle={styles.cardContent}
            onPress={() => navigation.navigate('CustomerTicketDetail', { ticketId: item.id })}
            accessibilityLabel={`Ticket ${item.ticketNumber}, ${item.title}`}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.number}>#{item.ticketNumber}</Text>
              <CustomerTicketStatusPill status={item.status} />
            </View>
            <Text style={styles.subject} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.submitted}>Submitted {formatSubmittedDate(item.createdAt)}</Text>
            <CustomerTicketTimeline items={item.timeline} compact />
            <Text style={styles.viewDetails}>View details</Text>
          </CustomerCard>
        )}
      />
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    canvas: { flex: 1, backgroundColor: theme.colors.bgDeep, padding: theme.spacing.lg },
    cta: { marginBottom: theme.spacing.md },
    list: { paddingBottom: theme.spacing.xxxl, gap: theme.spacing.sm },
    cardWrap: { borderRadius: theme.radius.lg },
    cardContent: { gap: theme.spacing.sm },
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
