import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { CustomerBadge, CustomerButton, CustomerSkeletonLoader } from '@/components/customer/ui';
import { CustomerFontProvider } from '@/components/customer/CustomerFontProvider';
import { ErrorState } from '@/components/common';
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
        <CustomerSkeletonLoader rows={4} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.canvas}>
        <ErrorState message="Could not load tickets" onRetry={refetch} />
      </View>
    );
  }

  return (
    <View style={styles.canvas}>
      <CustomerButton
        label="Raise a ticket"
        onPress={() => navigation.navigate('CreateCustomerTicket')}
        style={styles.cta}
      />
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No tickets yet</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('CustomerTicketDetail', { ticketId: item.id })}
          >
            <Text style={styles.number}>{item.ticketNumber}</Text>
            <Text style={styles.subject}>{item.title}</Text>
            <View style={styles.meta}>
              <CustomerBadge label={item.status} tone="info" />
              <Text style={styles.date}>{formatRelativeIst(item.updatedAt)}</Text>
            </View>
          </Pressable>
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
  canvas: { flex: 1, backgroundColor: signalGlass.colors.bgDeep },
  cta: { margin: signalGlass.spacing.lg },
  list: { paddingHorizontal: signalGlass.spacing.lg, paddingBottom: signalGlass.spacing.xxxl },
  card: {
    backgroundColor: signalGlass.colors.bgSurface,
    borderRadius: signalGlass.radius.md,
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
    padding: signalGlass.spacing.lg,
    marginBottom: signalGlass.spacing.sm,
  },
  number: {
    color: signalGlass.colors.accentGlow,
    fontFamily: signalGlass.fonts.mono,
    fontSize: 12,
  },
  subject: {
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.bodyMedium,
    fontSize: 16,
    fontWeight: '600',
    marginTop: signalGlass.spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: signalGlass.spacing.sm,
  },
  date: { color: signalGlass.colors.textMuted, fontSize: 12 },
  empty: { color: signalGlass.colors.textSecondary, textAlign: 'center', marginTop: 40 },
});
