import { useCallback, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { AdminScreenLayout, RoleGuard, SectionCard, StatusBadge } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useCustomerSupport } from '@/hooks/useCustomerSupport';
import { logCustomerInteraction } from '@/services/complaintService';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminSupportStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<AdminSupportStackParamList, 'CustomerSupportProfile'>;
type Tab = 'tickets' | 'chats' | 'complaints' | 'interactions';

export function CustomerSupportProfileScreen({ route, navigation }: Props) {
  const { customerId } = route.params;
  const [tab, setTab] = useState<Tab>('tickets');
  const { user, customerTickets, customerChats, customerComplaints, interactions, avgCsat, isLoading } =
    useCustomerSupport(customerId);

  const handleLogCall = useCallback(async () => {
    await logCustomerInteraction({
      customerId,
      interactionType: 'call',
      direction: 'outbound',
      subject: 'Support call',
    });
  }, [customerId]);

  if (isLoading) return <Screen><SkeletonLoader rows={8} showAvatar /></Screen>;
  if (!user) return <Screen><ErrorState message="Customer not found" onRetry={() => {}} /></Screen>;

  return (
    <RoleGuard requiredPermission="users.view">
      <AdminScreenLayout>
        <ScrollView>
          <SectionCard title="Account Overview">
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.meta}>Account: {user.accountNumber ?? user.id.slice(0, 8)}</Text>
            <Text style={styles.meta}>Plan: {user.planName ?? '—'}</Text>
            <StatusBadge status={user.isBlocked ? 'inactive' : 'active'} />
          </SectionCard>

          <SectionCard title="Contact">
            <Text style={styles.meta}>{user.email}</Text>
            <Text style={styles.meta}>{user.phone ?? '—'}</Text>
          </SectionCard>

          <View style={styles.quickActions}>
            <Button label="Raise Ticket" onPress={() => navigation.navigate('CreateTicket', { customerId })} />
            <Button label="Live Chat" variant="ghost" onPress={() => navigation.navigate('LiveChat')} />
            <Button label="Log Call" variant="ghost" onPress={() => void handleLogCall()} />
          </View>

          {avgCsat != null ? (
            <SectionCard title="CSAT Summary">
              <Text style={styles.csat}>{avgCsat.toFixed(1)} ⭐ average</Text>
            </SectionCard>
          ) : null}

          <View style={styles.tabs}>
            {(['tickets', 'chats', 'complaints', 'interactions'] as Tab[]).map((t) => (
              <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          {tab === 'tickets' ? (
            <FlatList
              data={customerTickets}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable style={styles.row} onPress={() => navigation.navigate('TicketDetail', { ticketId: item.id })}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowMeta}>{item.status} · {item.createdAt.toLocaleDateString()}</Text>
                </Pressable>
              )}
            />
          ) : null}

          {tab === 'chats' ? (
            <FlatList
              data={customerChats}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.rowTitle}>{item.status}</Text>
                  <Text style={styles.rowMeta}>{new Date(item.startedAt).toLocaleDateString()}</Text>
                </View>
              )}
            />
          ) : null}

          {tab === 'complaints' ? (
            <FlatList
              data={customerComplaints}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable style={styles.row} onPress={() => navigation.navigate('ComplaintDetail', { complaintId: item.id })}>
                  <Text style={styles.rowTitle}>{item.complaintNumber}</Text>
                  <Text style={styles.rowMeta}>{item.status}</Text>
                </Pressable>
              )}
            />
          ) : null}

          {tab === 'interactions' ? (
            <FlatList
              data={interactions}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.rowTitle}>{item.interactionType}</Text>
                  <Text style={styles.rowMeta}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
              )}
            />
          ) : null}
        </ScrollView>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.md },
  csat: { fontSize: 16, fontWeight: '700', color: adminColors.primary },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999, backgroundColor: colors.borderDefault },
  tabActive: { backgroundColor: adminColors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.textPrimary, textTransform: 'capitalize' },
  tabTextActive: { color: colors.white },
  row: { backgroundColor: colors.surfaceWhite, padding: spacing.md, borderRadius: 8, marginBottom: spacing.sm },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  rowMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
