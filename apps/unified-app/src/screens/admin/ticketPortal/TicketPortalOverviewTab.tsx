import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EscalationBanner, StatsCard, SupportStatsRow } from '@/components/support';
import { AdminEmptyState, SectionCard } from '@/components/admin';
import { SkeletonLoader } from '@/components/common';
import { useTicketPortalStats } from '@/hooks/useTicketPortalStats';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { PortalStatusBucket } from '@/types/portalTicket';

type TicketPortalOverviewTabProps = {
  onFilterStatus: (status: PortalStatusBucket) => void;
  onOpenItem: (ticketId: string) => void;
  onSwitchToAllTickets: () => void;
};

export function TicketPortalOverviewTab({
  onFilterStatus,
  onOpenItem,
  onSwitchToAllTickets,
}: TicketPortalOverviewTabProps) {
  const { stats, openBreachedItems, loading } = useTicketPortalStats();

  if (loading && stats.total === 0) {
    return <SkeletonLoader rows={6} />;
  }

  const csatLabel = stats.avgCsatScore != null ? `${stats.avgCsatScore} ⭐` : '—';

  return (
    <View style={styles.container}>
      <SupportStatsRow>
        <StatsCard label="Open" value={stats.totalOpen} onPress={() => onFilterStatus('Open')} />
        <StatsCard
          label="In Progress"
          value={stats.totalInProgress}
          onPress={() => onFilterStatus('In Progress')}
        />
        <StatsCard
          label="Awaiting"
          value={stats.totalAwaiting}
          onPress={() => onFilterStatus('Awaiting Customer')}
        />
        <StatsCard
          label="Resolved"
          value={stats.totalResolved}
          onPress={() => onFilterStatus('Resolved')}
        />
        <StatsCard label="Closed" value={stats.totalClosed} onPress={() => onFilterStatus('Closed')} />
        <StatsCard
          label="SLA Breaches"
          value={stats.slaBreaches}
          tone="danger"
          onPress={onSwitchToAllTickets}
        />
      </SupportStatsRow>

      <SupportStatsRow>
        <StatsCard label="Today" value={stats.today} />
        <StatsCard label="CSAT" value={csatLabel} tone="success" />
        <StatsCard label="Unassigned" value={stats.unassigned} onPress={onSwitchToAllTickets} />
        <StatsCard label="Assigned" value={stats.assigned} onPress={onSwitchToAllTickets} />
      </SupportStatsRow>

      {openBreachedItems.length > 0 ? (
        <SectionCard title="SLA Breaches">
          {openBreachedItems.slice(0, 5).map((item) => {
            if (!item.ticket) return null;
            return (
              <EscalationBanner
                key={item.id}
                ticketNumber={item.displayNumber}
                priority={item.ticket.priority}
                minutesOverdue={Math.abs(
                  Math.floor(item.ticket.slaStatus.resolutionRemainingMs / 60000),
                )}
                onPress={() => onOpenItem(item.ticket!.id)}
              />
            );
          })}
        </SectionCard>
      ) : (
        <SectionCard title="SLA Breaches">
          <AdminEmptyState
            title="No SLA breaches"
            subtitle="All open tickets are within their SLA windows."
            iconName="checkmark-circle-outline"
          />
        </SectionCard>
      )}

      <Pressable style={styles.cta} onPress={onSwitchToAllTickets}>
        <Text style={styles.ctaText}>View all tickets</Text>
        <Ionicons name="arrow-forward" size={16} color={adminColors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: adminColors.primary,
  },
});
