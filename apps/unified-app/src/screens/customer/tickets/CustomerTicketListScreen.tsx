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
import { CustomerFontProvider } from '@/components/customer/CustomerFontProvider';
import { DismissKeyboardFlatList } from '@/components/common';
import { useGetMyTicketsQuery } from '@/services/api/customerTicketsApi';
import { signalGlass } from '@/theme/customer/signalGlass';
import type { CustomerStackParamList } from '@/types/navigation';
import { formatRelativeIst } from '@/utils/formatDate';

type Props = NativeStackScreenProps<CustomerStackParamList, 'CustomerTicketList'>;

function TicketListContent({ navigation }: Props) {
  const { data, isLoading, error, refetch } = useGetMyTicketsQuery();

  if (isLoading) {
    return (
      <View style={styles.canvas}>
        <CustomerSkeletonLoader rows={4} rowHeight={88} />
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
              <Text style={styles.number}>{item.ticketNumber}</Text>
              <Text style={styles.subject} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.meta}>
                <CustomerBadge label={item.status} tone="info" />
                <Text style={styles.date}>{formatRelativeIst(item.updatedAt)}</Text>
              </View>
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

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: signalGlass.colors.bgDeep, padding: signalGlass.spacing.lg },
  cta: { marginBottom: signalGlass.spacing.md },
  list: { paddingBottom: signalGlass.spacing.xxxl },
  cardWrap: { marginBottom: signalGlass.spacing.sm },
  card: {
    backgroundColor: signalGlass.colors.bgSurface,
    borderRadius: signalGlass.radius.md,
    padding: signalGlass.spacing.md,
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
  },
  number: {
    fontFamily: signalGlass.fonts.mono,
    color: signalGlass.colors.accentGlow,
    fontSize: 12,
    marginBottom: signalGlass.spacing.xs,
  },
  subject: {
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.bodyMedium,
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: signalGlass.spacing.sm,
  },
  date: { color: signalGlass.colors.textMuted, fontSize: 11 },
});
