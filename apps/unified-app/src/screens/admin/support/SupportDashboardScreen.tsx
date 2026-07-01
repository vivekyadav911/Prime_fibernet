import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';


import {
  AgentStatusToggle,
  EscalationBanner,
  StatsCard,
  SupportQuickActions,
  SupportStatsRow,
} from '@/components/support';
import { TicketCard } from '@/components/TicketPortal';
import { AdminScreenLayout, RoleGuard, SectionCard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useAgentAvailability } from '@/hooks/useAgentAvailability';
import { useChatSession } from '@/hooks/useChatSession';
import { useTicketStats } from '@/hooks/useTickets';
import { useGetSupportDashboardStatsQuery } from '@/services/api/adminSupportApi';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminSupportStackParamList } from '@/types/navigation';
import { useAppSelector } from '@/store/hooks';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminSupportStackParamList, 'SupportDashboard'>;

const QUICK_ACTIONS = [
  { label: 'New Ticket', route: 'CreateTicket' as const, icon: '🎫' },
  { label: 'Live Chat', route: 'LiveChat' as const, icon: '💬' },
  { label: 'FAQs', route: 'FaqList' as const, icon: '📋' },
  { label: 'Analytics', route: 'SupportAnalytics' as const, icon: '📊' },
  { label: 'SLA Config', route: 'SlaConfig' as const, icon: '⚙️' },
  { label: 'Canned', route: 'CannedResponses' as const, icon: '💬' },
];

export function SupportDashboardScreen({ navigation }: Props) {
  const authUserId = useAppSelector((s) => s.auth.user?.id ?? null);
  const { status, updateStatus, loading: statusLoading } = useAgentAvailability(authUserId);
  const { data: stats, isLoading, isError, error, refetch } = useGetSupportDashboardStatsQuery();
  const { stats: ticketStats, openBreachedTickets, allTickets } = useTicketStats();
  const { waitingCount } = useChatSession();

  const breachedTickets = useMemo(() => openBreachedTickets.slice(0, 5), [openBreachedTickets]);

  const myTickets = useMemo(
    () =>
      allTickets
        .filter((t) => !['Resolved', 'Closed'].includes(t.status))
        .sort((a, b) => a.slaStatus.resolutionRemainingMs - b.slaStatus.resolutionRemainingMs)
        .slice(0, 5),
    [allTickets],
  );

  const quickActions = useMemo(
    () => QUICK_ACTIONS.map((a) => ({
      label: a.label,
      icon: a.icon,
      onPress: () => navigation.navigate(a.route),
    })),
    [navigation],
  );

  if (isLoading) {
    return (
      <AdminScreenLayout>
        <SkeletonLoader rows={8} />
      </AdminScreenLayout>
    );
  }

  if (isError) {
    return (
      <AdminScreenLayout>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </AdminScreenLayout>
    );
  }

  return (
    <RoleGuard requiredPermission="settings.view">
      <AdminScreenLayout>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.pageHeader}>
            <Text style={styles.title}>Customer Support</Text>
            {waitingCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{waitingCount} waiting</Text>
              </View>
            ) : null}
          </View>

          <SectionCard title="Agent Status">
            <AgentStatusToggle status={status} onChange={updateStatus} loading={statusLoading} />
          </SectionCard>

          <Text style={styles.eyebrow}>Overview</Text>
          <SupportStatsRow>
            <StatsCard label="Open" value={ticketStats.totalOpen} onPress={() => navigation.navigate('Tickets')} />
            <StatsCard label="In Progress" value={ticketStats.totalInProgress} />
            <StatsCard label="Breached" value={ticketStats.slaBreaches} tone="danger" />
            <StatsCard label="Today" value={stats?.ticketsToday ?? 0} />
            <StatsCard label="CSAT" value={stats?.avgCsatScore ? `${stats.avgCsatScore} ⭐` : '—'} tone="success" />
          </SupportStatsRow>

          {breachedTickets.length > 0 ? (
            <SectionCard title="SLA Breaches">
              {breachedTickets.map((t) => (
                <EscalationBanner
                  key={t.id}
                  ticketNumber={t.ticketNumber}
                  priority={t.priority}
                  minutesOverdue={Math.abs(Math.floor(t.slaStatus.resolutionRemainingMs / 60000))}
                  onPress={() => navigation.navigate('TicketDetail', { ticketId: t.id })}
                />
              ))}
            </SectionCard>
          ) : null}

          <SectionCard title="Quick Actions">
            <SupportQuickActions actions={quickActions} />
          </SectionCard>

          <SectionCard
            title="Urgent Open Tickets"
            actionLabel="View All"
            onAction={() => navigation.navigate('Tickets')}
          >
            {myTickets.length === 0 ? (
              <Text style={styles.empty}>No open tickets</Text>
            ) : (
              <View style={styles.ticketList}>
                {myTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onPress={(t) => navigation.navigate('TicketDetail', { ticketId: t.id })}
                  />
                ))}
              </View>
            )}
          </SectionCard>
        </ScrollView>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  badge: {
    backgroundColor: adminColors.badgeDanger,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  ticketList: { gap: spacing.sm },
  empty: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
