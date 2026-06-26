import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import type { ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { FormField, RoleGuard, SectionCard, SelectField } from '@/components/admin';
import { DismissKeyboardScrollView } from '@/components/common';
import { usePlanForm } from '@/hooks/usePlanForm';
import { fetchPlanById } from '@/services/planService';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminPlansStackParamList } from '@/types/navigation';
import type { Plan } from '@/types/plans';
import { DATA_LIMIT_PRESETS, PLAN_CATEGORY_OPTIONS } from '@/types/plans';
import { formatINR, formatValidity, getSpeedTier } from '@/utils/planUtils';

type Props = NativeStackScreenProps<AdminPlansStackParamList, 'PlanForm'>;

type ValidityUnit = 'days' | 'months';

export function PlanFormScreenV2({ route, navigation }: Props) {
  const mode = route.params?.mode ?? (route.params?.planId ? 'edit' : 'create');
  const planId = route.params?.planId;
  const [existingPlan, setExistingPlan] = useState<Plan | undefined>();
  const [loadingPlan, setLoadingPlan] = useState(!!planId);
  const [validityUnit, setValidityUnit] = useState<ValidityUnit>('days');
  const [validityNumber, setValidityNumber] = useState('');
  const [customDataLimit, setCustomDataLimit] = useState('');
  const [featureInput, setFeatureInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!planId) return;
    void (async () => {
      setLoadingPlan(true);
      try {
        const plan = await fetchPlanById(planId);
        setExistingPlan(plan);
        if (plan.validityDays % 30 === 0 && plan.validityDays >= 30) {
          setValidityUnit('months');
          setValidityNumber(String(plan.validityDays / 30));
        } else {
          setValidityUnit('days');
          setValidityNumber(String(plan.validityDays));
        }
      } finally {
        setLoadingPlan(false);
      }
    })();
  }, [planId]);

  const {
    formData,
    errors,
    updateField,
    submitPlan,
    isSubmitting,
    computedPerDayCost,
    duplicateNameWarning,
    subscriberCount,
  } = usePlanForm(existingPlan);

  const syncValidityDays = useCallback(
    (num: string, unit: ValidityUnit) => {
      setValidityNumber(num);
      const n = Number(num);
      if (!n || Number.isNaN(n)) {
        updateField('validityDays', '');
        return;
      }
      const days = unit === 'months' ? n * 30 : n;
      updateField('validityDays', days);
    },
    [updateField],
  );

  const speedTier = getSpeedTier(Number(formData.speedMbps) || 0);
  const validityPreview =
    Number(formData.validityDays) > 0 ? formatValidity(Number(formData.validityDays)) : '—';

  const dataLimitValue = String(formData.dataLimit);
  const isCustomDataLimit = !DATA_LIMIT_PRESETS.slice(0, -1).includes(
    dataLimitValue as (typeof DATA_LIMIT_PRESETS)[number],
  );

  const addFeature = useCallback(() => {
    const trimmed = featureInput.trim();
    if (!trimmed) return;
    updateField('features', [...formData.features, trimmed]);
    setFeatureInput('');
  }, [featureInput, formData.features, updateField]);

  const removeFeature = useCallback(
    (index: number) => {
      updateField(
        'features',
        formData.features.filter((_, i) => i !== index),
      );
    },
    [formData.features, updateField],
  );

  const handleSave = useCallback(
    async (duplicateAfterSave = false) => {
      const result = await submitPlan({ duplicateAfterSave });
      if (result) navigation.goBack();
    },
    [navigation, submitPlan],
  );

  if (loadingPlan) {
    return (
      <Screen style={adminScreenStyles.canvas}>
        <ActivityIndicator size="large" color={adminColors.primary} />
      </Screen>
    );
  }

  return (
    <RoleGuard requiredPermission={mode === 'edit' ? 'plans.edit' : 'plans.create'}>
      <Screen keyboardDismiss={false} style={adminScreenStyles.canvas} padded={false}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.flex}>
            <DismissKeyboardScrollView ref={scrollRef} contentContainerStyle={styles.scroll}>
            <Text style={styles.screenTitle}>{mode === 'edit' ? 'Edit Plan' : 'New Plan'}</Text>

            <SectionCard title="Basic Info">
              <FormField
                label="Display Name *"
                value={formData.displayName}
                onChangeText={(v) => updateField('displayName', v)}
                error={errors.displayName}
              />
              {duplicateNameWarning ? (
                <Text style={styles.warning}>A plan with this name already exists</Text>
              ) : null}
              <FormField
                label="Internal Name / Label"
                value={formData.name}
                onChangeText={(v) => updateField('name', v)}
              />
              <FormField
                label="Plan Tag"
                value={formData.planTag}
                onChangeText={(v) => updateField('planTag', v)}
              />
              <SelectField
                label="Category *"
                value={formData.category}
                options={PLAN_CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                onSelect={(v) => updateField('category', v)}
              />
              <FormField
                label="Description"
                value={formData.description}
                onChangeText={(v) => updateField('description', v)}
                multiline
                numberOfLines={3}
              />
            </SectionCard>

            <SectionCard title="Speed & Validity">
              <FormField
                label="Speed (Mbps) *"
                value={formData.speedMbps === '' ? '' : String(formData.speedMbps)}
                onChangeText={(v) => updateField('speedMbps', v === '' ? '' : Number(v))}
                keyboardType="numeric"
                error={errors.speedMbps}
              />
              {Number(formData.speedMbps) > 0 ? (
                <View style={[styles.tierChip, { backgroundColor: speedTier.color }]}>
                  <Text style={styles.tierChipText}>{speedTier.label}</Text>
                </View>
              ) : null}
              <View style={styles.row}>
                <FormField
                  label="Validity *"
                  value={validityNumber}
                  onChangeText={(v) => syncValidityDays(v, validityUnit)}
                  keyboardType="numeric"
                  containerStyle={styles.halfField}
                  error={errors.validityDays}
                />
                <SelectField
                  label="Unit"
                  value={validityUnit}
                  options={[
                    { value: 'days' as const, label: 'Days' },
                    { value: 'months' as const, label: 'Months' },
                  ]}
                  onSelect={(v) => {
                    setValidityUnit(v);
                    syncValidityDays(validityNumber, v);
                  }}
                />
              </View>
              <Text style={styles.preview}>= {validityPreview}</Text>
            </SectionCard>

            <SectionCard title="Pricing">
              <FormField
                label="Price (₹) *"
                value={formData.price === '' ? '' : String(formData.price)}
                onChangeText={(v) => updateField('price', v === '' ? '' : Number(v))}
                keyboardType="decimal-pad"
                error={errors.price}
              />
              <FormField
                label="Per Day Cost"
                value={`${formatINR(computedPerDayCost)} / day`}
                editable={false}
              />
              <FormField label="Currency" value="INR" editable={false} />
              {mode === 'edit' && subscriberCount > 0 ? (
                <Text style={styles.revenuePreview}>
                  {subscriberCount} subscribers × {formatINR(Number(formData.price) || 0)} ={' '}
                  {formatINR(subscriberCount * (Number(formData.price) || 0))}
                </Text>
              ) : null}
            </SectionCard>

            <SectionCard title="Features">
              <SelectField
                label="Data Limit *"
                value={isCustomDataLimit ? 'Custom' : (dataLimitValue as typeof DATA_LIMIT_PRESETS[number])}
                options={DATA_LIMIT_PRESETS.map((p) => ({ value: p, label: p }))}
                onSelect={(v) => {
                  if (v === 'Custom') {
                    updateField('dataLimit', customDataLimit || '');
                  } else {
                    updateField('dataLimit', v);
                  }
                }}
              />
              {isCustomDataLimit || dataLimitValue === 'Custom' ? (
                <FormField
                  label="Custom Data Limit"
                  value={isCustomDataLimit ? dataLimitValue : customDataLimit}
                  onChangeText={(v) => {
                    setCustomDataLimit(v);
                    updateField('dataLimit', v);
                  }}
                  error={errors.dataLimit}
                />
              ) : null}
              <FormField
                label="Router / Equipment"
                value={formData.routerType}
                onChangeText={(v) => updateField('routerType', v)}
              />
              <View style={styles.featureRow}>
                <FormField
                  label="Additional Feature"
                  value={featureInput}
                  onChangeText={setFeatureInput}
                  containerStyle={styles.featureInput}
                />
                <Button label="Add" variant="secondary" onPress={addFeature} />
              </View>
              <View style={styles.chipRow}>
                {formData.features.map((f, i) => (
                  <Pressable key={`${f}-${i}`} style={styles.featureChip} onPress={() => removeFeature(i)}>
                    <Text style={styles.featureChipText}>{f} ×</Text>
                  </Pressable>
                ))}
              </View>
            </SectionCard>

            <SectionCard title="Settings">
              <View style={styles.switchRow}>
                <View style={styles.switchLabels}>
                  <Text style={styles.switchTitle}>Plan Active</Text>
                  <Text style={styles.switchDesc}>Subscribers can be assigned to this plan</Text>
                </View>
                <Switch
                  value={formData.isActive}
                  onValueChange={(v) => updateField('isActive', v)}
                  trackColor={{ false: colors.borderDefault, true: '#14B8A6' }}
                />
              </View>
              <FormField
                label="Sort Order"
                value={formData.sortOrder === '' ? '' : String(formData.sortOrder)}
                onChangeText={(v) => updateField('sortOrder', v === '' ? '' : Number(v))}
                keyboardType="numeric"
                helperText="Controls display order in plan lists. Leave 0 for auto."
              />
            </SectionCard>
            </DismissKeyboardScrollView>

          <View style={styles.footer}>
            <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
            {mode === 'edit' ? (
              <Button
                label="Save & Duplicate"
                variant="secondary"
                disabled={isSubmitting}
                onPress={() => void handleSave(true)}
              />
            ) : null}
            <Button
              label={isSubmitting ? 'Saving…' : 'Save Plan'}
              disabled={isSubmitting}
              onPress={() => void handleSave(false)}
              style={styles.saveBtn}
            />
          </View>
          </View>
        </KeyboardAvoidingView>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.sm, paddingBottom: spacing.xxl },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xxs,
  },
  warning: { color: '#CA8A04', fontSize: 12, marginBottom: spacing.sm },
  tierChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  tierChipText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', gap: spacing.sm },
  halfField: { flex: 1 },
  preview: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm },
  revenuePreview: { fontSize: 13, color: adminColors.primary, fontWeight: '600' },
  featureRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  featureInput: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  featureChip: {
    backgroundColor: adminColors.primaryTint,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
  },
  featureChipText: { color: adminColors.primary, fontSize: 12 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  switchLabels: { flex: 1, marginRight: spacing.sm },
  switchTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  switchDesc: { fontSize: 12, color: colors.textSecondary },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  saveBtn: { flex: 1 },
});
