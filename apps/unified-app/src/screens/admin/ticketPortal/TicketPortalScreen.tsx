import { useCallback, useRef } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { formatDistanceToNow } from 'date-fns';


import { CreateTicketForm } from '@/components/TicketPortal';
import { PoolBadge, TicketStatusBadge } from '@/components/TicketPortal/TicketStatusBadge';
import { AdminScreenLayout, RoleGuard, SectionCard } from '@/components/admin';
import { useTickets } from '@/hooks/useTickets';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminTicketsStackParamList } from '@/types/navigation';
import type { Ticket } from '@/types/tickets';

type Props = NativeStackScreenProps<AdminTicketsStackParamList, 'TicketPortalHome'>;

export function TicketPortalScreen({ navigation, route }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const linkedRequestId = route.params?.linkedRequestId;
  const linkedRequestNumber = route.params?.linkedRequestNumber;
  const { allTickets, reload } = useTickets();

  const recentTickets = allTickets.slice(0, 5);

  const handleCreated = useCallback(async () => {
    await reload(true);
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [reload]);

  const renderRecent = useCallback(
    ({ item }: { item: Ticket }) => (
      <Pressable
        style={styles.recentCard}
        onPress={() => navigation.navigate('TicketDetail', { ticketId: item.id })}
      >
        <Text style={styles.recentTitle} numberOfLines={1}>
          {item.complaintType}
        </Text>
        <Text style={styles.recentSub} numberOfLines={1}>
          {item.contactName} · {formatDistanceToNow(item.createdAt, { addSuffix: true })}
        </Text>
        <View style={styles.recentBadge}>
          {item.assignedOfficerId ? (
            <TicketStatusBadge status={item.status} compact />
          ) : (
            <PoolBadge />
          )}
        </View>
      </Pressable>
    ),
    [navigation],
  );

  return (
    <RoleGuard requiredPermission="requests.view">
      <AdminScreenLayout>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll}>
          <SectionCard title="">
            <CreateTicketForm
              linkedRequestId={linkedRequestId}
              linkedRequestNumber={linkedRequestNumber}
              onCreated={handleCreated}
            />
          </SectionCard>

          <View style={styles.recentHeader}>
            <Text style={styles.recentSectionTitle}>Recently Created</Text>
            <Pressable onPress={() => navigation.navigate('TicketList')}>
              <Text style={styles.viewAll}>View All</Text>
            </Pressable>
          </View>

          <FlatList
            data={recentTickets}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentList}
            ListEmptyComponent={
              <Text style={styles.emptyRecent}>No tickets yet — create your first ticket above.</Text>
            }
            renderItem={renderRecent}
          />
        </ScrollView>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  recentSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
    color: adminColors.primary,
  },
  recentList: {
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  recentCard: {
    width: 200,
    backgroundColor: adminColors.cardBg,
    borderRadius: 12,
    padding: spacing.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recentSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  recentBadge: {
    marginTop: spacing.sm,
  },
  emptyRecent: {
    color: colors.textSecondary,
    fontSize: 13,
    paddingVertical: spacing.md,
  },
});
