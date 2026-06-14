import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@prime/ui';

import { AvatarIcon } from '@/components/admin';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { ServiceRequest } from '@/types/requests';
import { truncateRequestId } from '@/utils/requestViewMappers';

type RequestCardProps = {
  request: ServiceRequest;
  variant: 'unassigned' | 'assigned';
  onPress: () => void;
  onAssign?: () => void;
};

const STATUS_STYLES: Record<
  ServiceRequest['status'],
  { bg: string; text: string }
> = {
  Pending: { bg: '#FEF3C7', text: '#92400E' },
  'In Progress': { bg: '#3B82F6', text: '#FFFFFF' },
  Completed: { bg: '#10B981', text: '#FFFFFF' },
  Cancelled: { bg: '#6B7280', text: '#FFFFFF' },
};

function StatusBadge({ status }: { status: ServiceRequest['status'] }) {
  const style = STATUS_STYLES[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
      <Text style={[styles.statusText, { color: style.text }]}>{status}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  text,
  muted,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  muted?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={14} color={colors.textSecondary} />
      <Text style={[styles.infoText, muted && styles.mutedText]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

export function RequestCard({ request, variant, onPress, onAssign }: RequestCardProps) {
  const relativeTime =
    variant === 'assigned' && request.assignedAt
      ? `Assigned ${formatDistanceToNow(new Date(request.assignedAt), { addSuffix: true })}`
      : `Requested ${formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}`;

  const planLabel = request.planName && request.planName !== 'Unknown Plan' ? request.planName : 'Unknown Plan';
  const planMuted = planLabel === 'Unknown Plan';

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.headerRow}>
        <StatusBadge status={request.status} />
        {request.source === 'admin' ? (
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceText}>From admin</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.requestId}>{truncateRequestId(request.id)}</Text>
      <Text style={styles.requestType}>{request.type}</Text>
      <Text style={styles.relativeTime}>{relativeTime}</Text>

      <InfoRow icon="person-outline" text={request.customerName} />
      <InfoRow icon="wifi-outline" text={planLabel} muted={planMuted} />
      {request.customerAddress ? (
        <InfoRow icon="location-outline" text={request.customerAddress} />
      ) : null}

      <View style={styles.footer}>
        {variant === 'unassigned' ? (
          <>
            <View style={styles.officerMuted}>
              <AvatarIcon name="?" size={28} />
              <Text style={styles.noOfficer}>No officer assigned</Text>
            </View>
            <Button label="Assign Officer" onPress={() => onAssign?.()} />
          </>
        ) : (
          <>
            <View style={styles.officerInfo}>
              <AvatarIcon name={request.assignedOfficerName ?? 'O'} size={32} />
              <View style={styles.officerText}>
                <Text style={styles.officerName}>{request.assignedOfficerName}</Text>
                <Text style={styles.officerRole}>{request.assignedOfficerRole}</Text>
              </View>
            </View>
            <Pressable onPress={onPress}>
              <Text style={styles.viewDetails}>View Details</Text>
            </Pressable>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  statusBadge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  sourceBadge: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: adminColors.primaryTint,
  },
  sourceText: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
  requestId: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 12,
    color: adminColors.primary,
    fontWeight: '600',
  },
  requestType: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
  relativeTime: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xxs },
  infoText: { fontSize: 14, color: colors.textPrimary, flex: 1 },
  mutedText: { color: colors.textSecondary, fontStyle: 'italic' },
  footer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  officerMuted: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  noOfficer: { fontSize: 12, color: colors.textSecondary },
  officerInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  officerText: { flex: 1 },
  officerName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  officerRole: { fontSize: 12, color: colors.textSecondary },
  viewDetails: { fontSize: 14, fontWeight: '600', color: adminColors.primary },
});
