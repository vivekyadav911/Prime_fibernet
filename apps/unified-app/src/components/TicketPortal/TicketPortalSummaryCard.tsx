import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SectionCard } from '@/components/admin';
import { useTicketPortalStats } from '@/hooks/useTicketPortalStats';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type TicketPortalSummaryCardProps = {
  onPress: () => void;
};

export function TicketPortalSummaryCard({ onPress }: TicketPortalSummaryCardProps) {
  const { stats } = useTicketPortalStats();

  return (
    <SectionCard title="Ticket Portal">
      <Pressable style={styles.card} onPress={onPress}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name="ticket-outline" size={22} color={adminColors.primary} />
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.summary}>
              {stats.totalOpen} open ticket{stats.totalOpen === 1 ? '' : 's'}
              {stats.slaBreaches > 0 ? ` · ${stats.slaBreaches} breached` : ''}
            </Text>
            <Text style={styles.hint}>
              {stats.unassigned > 0
                ? `${stats.unassigned} unassigned — triage in Ticket Portal`
                : 'All tickets are assigned'}
            </Text>
          </View>
          <Text style={styles.link}>Open Ticket Portal →</Text>
        </View>
      </Pressable>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: adminColors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { flex: 1, minWidth: 0 },
  summary: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  hint: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  link: { fontSize: 13, fontWeight: '700', color: adminColors.primary },
});
