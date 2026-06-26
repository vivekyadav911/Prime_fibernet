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
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useGetMyTicketsQuery } from '@/services/api/customerTicketsApi';
import type { CustomerStackParamList } from '@/types/navigation';
import type { CustomerTheme } from '@/theme/customer';
import { formatRelativeIst } from '@/utils/formatDate';

type Props = NativeStackScreenProps<CustomerStackParamList, 'CustomerTicketList'>;

function TicketListContent({ navigation }: Props) {
  const styles = useThemedStyles(createStyles);
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
    },
    number: {
      fontFamily: theme.fonts.mono,
      color: theme.colors.accentGlow,
      fontSize: 12,
      marginBottom: theme.spacing.xs,
    },
    subject: {
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.bodyMedium,
      fontSize: 15,
      fontWeight: '600',
    },
    meta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.sm,
    },
    date: { color: theme.colors.textMuted, fontSize: 11 },
  });
