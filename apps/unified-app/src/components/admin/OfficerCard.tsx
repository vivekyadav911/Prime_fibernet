import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarIcon } from './AvatarIcon';
import { StatusBadge } from './StatusBadge';
import { OfficerFieldStatusBadge } from './officers/OfficerFieldStatusBadge';
import type { AdminOfficerDetail } from '@/types/api/admin';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type OfficerCardProps = {
  officer: AdminOfficerDetail;
  onViewDetails: () => void;
  onMenuPress?: () => void;
  canManage?: boolean;
};

export const OfficerCard = memo(function OfficerCard({
  officer,
  onViewDetails,
  onMenuPress,
  canManage,
}: OfficerCardProps) {
  const fieldStatus = useMemo(
    () => officer.fieldStatus ?? officer.availabilityStatus,
    [officer.fieldStatus, officer.availabilityStatus],
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <AvatarIcon name={officer.name} size={48} />
          {officer.isActive && !officer.isBlocked ? (
            <View style={styles.activeDot} />
          ) : null}
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{officer.name}</Text>
          </View>
          <View style={styles.badgeRow}>
            <OfficerFieldStatusBadge status={fieldStatus} />
            <StatusBadge status={officer.accountStatus} />
          </View>
        </View>
        {canManage && onMenuPress ? (
          <Pressable style={styles.menuBtn} onPress={onMenuPress} accessibilityLabel="Officer actions">
            <Text style={styles.menuIcon}>⋮</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaIcon}>✉</Text>
        <Text style={styles.metaText}>{officer.email}</Text>
      </View>
      {officer.designation ? (
        <View style={styles.metaRow}>
          <Text style={styles.metaIcon}>👤</Text>
          <Text style={styles.metaText}>{officer.designation}</Text>
        </View>
      ) : null}
      {officer.region ? (
        <View style={styles.metaRow}>
          <Text style={styles.metaIcon}>📍</Text>
          <Text style={styles.metaText}>{officer.region.toUpperCase()}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Pressable style={styles.viewBtn} onPress={onViewDetails}>
          <Text style={styles.viewBtnText}>View Details</Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  avatarWrap: { position: 'relative' },
  activeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: adminColors.badgeActive,
    borderWidth: 2,
    borderColor: adminColors.cardBg,
  },
  headerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  name: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxs, marginTop: spacing.xxs },
  menuBtn: { padding: spacing.xxs },
  menuIcon: { fontSize: 20, color: colors.textSecondary, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  metaIcon: { fontSize: 14, width: 20 },
  metaText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  footer: { alignItems: 'flex-end', marginTop: spacing.sm },
  viewBtn: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  viewBtnText: { fontSize: 14, color: colors.textPrimary, fontWeight: '600' },
});
