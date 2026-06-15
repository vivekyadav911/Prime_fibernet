import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarIcon } from './AvatarIcon';
import type { AdminOfficerDetail } from '@/types/api/admin';
import type { OfficerFieldStatus } from '@/types/api/officer';
import { dash as ui } from '@/screens/admin/DashboardScreen/dashboardUi';

type OfficerCardProps = {
  officer: AdminOfficerDetail;
  onViewDetails: () => void;
  onMenuPress?: () => void;
  canManage?: boolean;
};

const FIELD_LABELS: Record<OfficerFieldStatus, string> = {
  ON_FIELD: 'On Field',
  BUSY: 'Busy',
  AVAILABLE: 'Available',
  OFFLINE: 'Offline',
};

function fieldChipColors(status: string): { bg: string; text: string } {
  const key = status.toUpperCase().replace(/\s/g, '_');
  if (key === 'ON_FIELD') return { bg: 'rgba(16, 185, 129, 0.1)', text: ui.success };
  if (key === 'BUSY') return { bg: 'rgba(245, 158, 11, 0.12)', text: ui.warning };
  if (key === 'AVAILABLE') return { bg: 'rgba(13, 148, 136, 0.1)', text: '#0D9488' };
  return { bg: '#F3F4F6', text: ui.textSecondary };
}

function accountChipColors(status: string): { bg: string; text: string } {
  const key = status.toLowerCase();
  if (key === 'active') return { bg: 'rgba(16, 185, 129, 0.1)', text: ui.success };
  if (key === 'blocked') return { bg: 'rgba(239, 68, 68, 0.1)', text: ui.danger };
  if (key === 'inactive') return { bg: '#F3F4F6', text: ui.textSecondary };
  return { bg: '#F3F4F6', text: ui.textSecondary };
}

function StatusChip({ label, bg, text }: { label: string; bg: string; text: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color: text }]}>{label}</Text>
    </View>
  );
}

function MetaRow({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={15} color={ui.textSecondary} />
      <Text style={styles.metaText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

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

  const fieldKey = fieldStatus.toUpperCase().replace(/\s/g, '_') as OfficerFieldStatus;
  const fieldLabel = FIELD_LABELS[fieldKey] ?? fieldStatus.replace(/_/g, ' ');
  const fieldColors = fieldChipColors(fieldStatus);
  const accountColors = accountChipColors(officer.accountStatus);
  const accountLabel = officer.accountStatus.replace(/_/g, ' ');

  return (
    <View style={styles.card}>
      <View style={styles.identityRow}>
        <View style={styles.avatarWrap}>
          <AvatarIcon name={officer.name} size={56} />
          {officer.isActive && !officer.isBlocked ? <View style={styles.activeDot} /> : null}
        </View>

        <View style={styles.identityMain}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {officer.name}
            </Text>
            {canManage && onMenuPress ? (
              <Pressable
                style={styles.menuBtn}
                onPress={onMenuPress}
                accessibilityLabel="Officer actions"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="ellipsis-vertical" size={18} color={ui.textSecondary} />
              </Pressable>
            ) : (
              <View style={styles.menuSpacer} />
            )}
          </View>

          <View style={styles.chipRow}>
            <StatusChip label={fieldLabel} bg={fieldColors.bg} text={fieldColors.text} />
            <StatusChip label={accountLabel} bg={accountColors.bg} text={accountColors.text} />
          </View>
        </View>
      </View>

      <View style={styles.metaBlock}>
        <MetaRow icon="mail-outline" text={officer.email} />
        {officer.region ? <MetaRow icon="location-outline" text={officer.region} /> : null}
        {officer.designation ? <MetaRow icon="briefcase-outline" text={officer.designation} /> : null}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.viewBtn, pressed && styles.viewBtnPressed]}
          onPress={onViewDetails}
          accessibilityRole="button"
          accessibilityLabel="View Details"
        >
          <Text style={styles.viewBtnText}>View Details</Text>
          <Ionicons name="arrow-forward" size={16} color={ui.brand} />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: ui.card,
    borderRadius: ui.radiusHero,
    padding: ui.cardPad,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ui.border,
    gap: 12,
    ...ui.shadow,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ui.success,
    borderWidth: 2,
    borderColor: ui.card,
  },
  identityMain: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
    letterSpacing: -0.2,
  },
  menuBtn: {
    width: ui.touch,
    height: ui.touch,
    alignItems: 'center',
    justifyContent: 'center',
    margin: -6,
  },
  menuSpacer: {
    width: ui.touch,
    height: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: ui.radiusPill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  metaBlock: {
    gap: 8,
    paddingTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: ui.textSecondary,
    lineHeight: 18,
  },
  footer: {
    alignItems: 'flex-end',
    paddingTop: 2,
  },
  viewBtn: {
    height: ui.btnH,
    paddingHorizontal: 16,
    borderRadius: ui.btnRadius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D8D2F8',
    backgroundColor: '#F7F6FE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 148,
  },
  viewBtnPressed: {
    opacity: 0.88,
  },
  viewBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: ui.brand,
  },
});
