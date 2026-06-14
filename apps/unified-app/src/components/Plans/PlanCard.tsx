import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { Plan } from '@/types/plans';
import { formatINR } from '@/utils/planUtils';

import { DeletePlanModal } from './DeletePlanModal';
import { DuplicatePlanModal } from './DuplicatePlanModal';

type PlanCardProps = {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  onToggleStatus: (plan: Plan, isActive: boolean) => Promise<void>;
  onDuplicate: (plan: Plan, displayName: string, planTag: string) => Promise<void>;
  onDelete: (plan: Plan) => Promise<void>;
  onMigrate: (plan: Plan) => void;
};

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaCell}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function PlanCard({
  plan,
  onEdit,
  onToggleStatus,
  onDuplicate,
  onDelete,
  onMigrate,
}: PlanCardProps) {
  const [duplicateVisible, setDuplicateVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleToggle = useCallback(
    (next: boolean) => {
      const run = async () => {
        setToggling(true);
        try {
          await onToggleStatus(plan, next);
        } catch (e) {
          Alert.alert('Error', e instanceof Error ? e.message : 'Could not update plan status');
        } finally {
          setToggling(false);
        }
      };

      if (!next && plan.subscriberCount > 0) {
        Alert.alert(
          'Deactivate plan?',
          `This plan has ${plan.subscriberCount} active subscriber${plan.subscriberCount === 1 ? '' : 's'}. Deactivating will not remove them but new subscriptions will be blocked.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Deactivate', style: 'destructive', onPress: () => void run() },
          ],
        );
        return;
      }
      void run();
    },
    [onToggleStatus, plan],
  );

  return (
    <>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={2}>
            {plan.displayName}
          </Text>
          <View style={styles.topRight}>
            <View style={[styles.badge, plan.isActive ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={styles.badgeText}>{plan.isActive ? 'ACTIVE' : 'INACTIVE'}</Text>
            </View>
            <Switch
              value={plan.isActive}
              onValueChange={handleToggle}
              disabled={toggling}
              trackColor={{ false: colors.borderDefault, true: '#14B8A6' }}
              thumbColor={colors.surfaceWhite}
            />
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatINR(plan.price)}</Text>
          <Text style={styles.validity}>/ {plan.validityDays} days</Text>
        </View>

        <View style={styles.metaGrid}>
          <MetaCell label="VALIDITY" value={plan.validityDisplay} />
          <MetaCell label="PER DAY COST" value={formatINR(plan.perDayCost)} />
          <MetaCell label="DATA LIMIT" value={String(plan.dataLimit)} />
          <MetaCell label="ROUTER" value={plan.routerType || '—'} />
        </View>

        {plan.planTag ? <Text style={styles.planTag}>{plan.planTag}</Text> : null}

        {plan.subscriberCount > 0 ? (
          <View style={styles.subscriberRow}>
            <Ionicons name="person-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.subscriberText}>{plan.subscriberCount} subscribers</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Pressable style={styles.editBtn} onPress={() => onEdit(plan)}>
            <Ionicons name="pencil" size={14} color={adminColors.primary} />
            <Text style={styles.editText}>Edit Plan</Text>
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => setDuplicateVisible(true)}>
            <Ionicons name="copy-outline" size={18} color="#6B7280" />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => setDeleteVisible(true)}>
            <Ionicons name="trash-outline" size={18} color={adminColors.deleteIcon} />
          </Pressable>
        </View>
      </View>

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
  card: {
    flex: 1,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.sm,
    margin: spacing.xxs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xxs, marginBottom: spacing.xs },
  title: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  topRight: { alignItems: 'flex-end', gap: spacing.xxs },
  badge: { paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.full },
  badgeActive: { backgroundColor: '#10B981' },
  badgeInactive: { backgroundColor: '#9CA3AF' },
  badgeText: { fontSize: 9, fontWeight: '700', color: colors.white },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xxs, marginBottom: spacing.sm },
  price: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  validity: { fontSize: 14, color: colors.textSecondary },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.xs },
  metaCell: { width: '50%', marginBottom: spacing.xs },
  metaLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', letterSpacing: 0.3 },
  metaValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  planTag: { fontSize: 11, color: colors.textSecondary, marginBottom: spacing.xxs },
  subscriberRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.xs },
  subscriberText: { fontSize: 11, color: colors.textSecondary },
  footer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.borderDefault, paddingTop: spacing.xs },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  editText: { color: adminColors.primary, fontWeight: '600', fontSize: 13 },
  iconBtn: { padding: spacing.xxs },
});
