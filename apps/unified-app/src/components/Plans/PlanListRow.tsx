import { useCallback, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ToggleSwitch } from '@/components/common';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { switchTheme } from '@/theme/switchTheme';
import type { Plan } from '@/types/plans';
import { formatINR, getSpeedTier } from '@/utils/planUtils';

import { DeletePlanModal } from './DeletePlanModal';
import { DuplicatePlanModal } from './DuplicatePlanModal';

type PlanListRowProps = {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  onToggleStatus: (plan: Plan, isActive: boolean) => Promise<void>;
  onDuplicate: (plan: Plan, displayName: string, planTag: string) => Promise<void>;
  onDelete: (plan: Plan) => Promise<void>;
  onMigrate: (plan: Plan) => void;
};

export function PlanListRow({
  plan,
  onEdit,
  onToggleStatus,
  onDuplicate,
  onDelete,
  onMigrate,
}: PlanListRowProps) {
  const [duplicateVisible, setDuplicateVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const tier = getSpeedTier(plan.speedMbps);

  const showMenu = useCallback(() => {
    const options = ['Edit', 'Duplicate', 'Delete', 'Cancel'];
    const destructiveIndex = 2;
    const cancelIndex = 3;

    const onSelect = (index: number) => {
      if (index === 0) onEdit(plan);
      if (index === 1) setDuplicateVisible(true);
      if (index === 2) setDeleteVisible(true);
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex },
        onSelect,
      );
    } else {
      Alert.alert('Plan actions', plan.displayName, [
        { text: 'Edit', onPress: () => onEdit(plan) },
        { text: 'Duplicate', onPress: () => setDuplicateVisible(true) },
        { text: 'Delete', style: 'destructive', onPress: () => setDeleteVisible(true) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [onEdit, plan]);

  const handleToggle = useCallback(
    (next: boolean) => {
      if (!next && plan.subscriberCount > 0) {
        Alert.alert(
          'Deactivate plan?',
          `This plan has ${plan.subscriberCount} active subscribers.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Deactivate',
              onPress: () => void onToggleStatus(plan, false).catch((e) =>
                Alert.alert('Error', e instanceof Error ? e.message : 'Failed'),
              ),
            },
          ],
        );
        return;
      }
      void onToggleStatus(plan, next).catch((e) =>
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed'),
      );
    },
    [onToggleStatus, plan],
  );

  return (
    <>
      <Pressable style={styles.row} onPress={() => onEdit(plan)}>
        <View style={[styles.speedCircle, { backgroundColor: tier.color }]}>
          <Text style={styles.speedText}>{tier.shortLabel}</Text>
        </View>

        <View style={styles.center}>
          <Text style={styles.name} numberOfLines={1}>
            {plan.displayName}
          </Text>
          {plan.planTag ? (
            <Text style={styles.tag} numberOfLines={1}>
              {plan.planTag}
            </Text>
          ) : null}
          <Text style={styles.meta} numberOfLines={1}>
            {formatINR(plan.price)} / {plan.validityDays}d • {plan.dataLimit} • {plan.routerType || '—'}
          </Text>
        </View>

        <View style={styles.right}>
          <ToggleSwitch
            value={plan.isActive}
            onValueChange={handleToggle}
            accentColor={switchTheme.accentTeal}
          />
          {plan.subscriberCount > 0 ? (
            <View style={styles.subBadge}>
              <Text style={styles.subBadgeText}>{plan.subscriberCount}</Text>
            </View>
          ) : null}
          <Pressable onPress={showMenu} hitSlop={8}>
            <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </Pressable>

      <DuplicatePlanModal
        visible={duplicateVisible}
        plan={plan}
        onClose={() => setDuplicateVisible(false)}
        onConfirm={async (displayName, planTag) => {
          await onDuplicate(plan, displayName, planTag);
          setDuplicateVisible(false);
        }}
      />

      <DeletePlanModal
        visible={deleteVisible}
        plan={plan}
        onClose={() => setDeleteVisible(false)}
        onConfirm={async () => {
          await onDelete(plan);
          setDeleteVisible(false);
        }}
        onMigrate={() => {
          setDeleteVisible(false);
          onMigrate(plan);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceWhite,
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    gap: spacing.sm,
  },
  speedCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  center: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  tag: { fontSize: 12, color: colors.textSecondary },
  meta: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: spacing.xxs },
  subBadge: {
    backgroundColor: adminColors.primaryTint,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  subBadgeText: { fontSize: 10, color: adminColors.primary, fontWeight: '600' },
});
