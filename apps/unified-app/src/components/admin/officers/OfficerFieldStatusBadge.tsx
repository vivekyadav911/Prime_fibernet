import { StyleSheet, Text, View } from 'react-native';
import type { OfficerFieldStatus } from '@/types/api/officer';
import { adminColors } from '@/theme/admin';
import { radius, spacing } from '@/theme/spacing';

const STATUS_LABELS: Record<OfficerFieldStatus, string> = {
  ON_FIELD: 'On Field',
  BUSY: 'Busy',
  AVAILABLE: 'Available',
  OFFLINE: 'Offline',
};

function resolveColors(status: string): { bg: string; text: string } {
  const key = status.toUpperCase().replace(/\s/g, '_') as OfficerFieldStatus;
  if (key === 'ON_FIELD') return adminColors.fieldStatus.onField;
  if (key === 'BUSY') return adminColors.fieldStatus.busy;
  if (key === 'AVAILABLE') return adminColors.fieldStatus.available;
  return adminColors.fieldStatus.offline;
}

type OfficerFieldStatusBadgeProps = {
  status: string;
};

export function OfficerFieldStatusBadge({ status }: OfficerFieldStatusBadgeProps) {
  const normalized = status.toUpperCase().replace(/\s/g, '_') as OfficerFieldStatus;
  const colors = resolveColors(normalized);
  const label = STATUS_LABELS[normalized] ?? status.replace(/_/g, ' ');

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.text }]}>
      <View style={[styles.dot, { backgroundColor: colors.text }]} />
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
});
