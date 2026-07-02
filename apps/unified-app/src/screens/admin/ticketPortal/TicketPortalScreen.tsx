import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenErrorBoundary } from '@/components/common';
import { AdminScreenLayout, AdminStateShell, RoleGuard } from '@/components/admin';
import type { PortalStatusBucket } from '@/types/portalTicket';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminTicketsStackParamList } from '@/types/navigation';

import { TicketPortalAllTicketsTab } from './TicketPortalAllTicketsTab';
import { TicketPortalOverviewTab } from './TicketPortalOverviewTab';

type Props = NativeStackScreenProps<AdminTicketsStackParamList, 'TicketPortalHome'>;
type PortalTab = 'overview' | 'all';

export function TicketPortalScreen({ navigation, route }: Props) {
  const initialTab = route.params?.initialTab ?? 'overview';
  const [activeTab, setActiveTab] = useState<PortalTab>(initialTab);
  const [statusSeed, setStatusSeed] = useState<PortalStatusBucket | undefined>();

  const openTicket = useCallback(
    (ticketId: string) => {
      navigation.navigate('TicketDetail', { ticketId });
    },
    [navigation],
  );

  const switchToAllTickets = useCallback((status?: PortalStatusBucket) => {
    if (status) setStatusSeed(status);
    setActiveTab('all');
  }, []);

  return (
    <RoleGuard requiredPermission="requests.view">
      <ScreenErrorBoundary screenName="Ticket Portal">
        <AdminStateShell isLoading={false} isError={false} loadingRows={6} loadingShape="card">
          <AdminScreenLayout>
            <View style={styles.header}>
              <Text style={styles.pageTitle}>Ticket Portal</Text>
            </View>

            <View style={styles.tabRow}>
              <Pressable
                style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
                onPress={() => setActiveTab('overview')}
              >
                <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
                  Overview
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tab, activeTab === 'all' && styles.tabActive]}
                onPress={() => setActiveTab('all')}
              >
                <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
                  All Tickets
                </Text>
              </Pressable>
            </View>

            {activeTab === 'overview' ? (
              <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <TicketPortalOverviewTab
                  onFilterStatus={(status) => switchToAllTickets(status)}
                  onOpenItem={openTicket}
                  onSwitchToAllTickets={() => switchToAllTickets()}
                />
              </ScrollView>
            ) : (
              <View style={styles.allTab}>
                <TicketPortalAllTicketsTab
                  navigation={navigation}
                  initialStatus={statusSeed}
                />
              </View>
            )}
          </AdminScreenLayout>
        </AdminStateShell>
      </ScreenErrorBoundary>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  pageTitle: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    borderRadius: 8,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: adminColors.primaryTint },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: adminColors.primary },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  allTab: {
    flex: 1,
    paddingHorizontal: spacing.md,
    minHeight: 0,
  },
});
