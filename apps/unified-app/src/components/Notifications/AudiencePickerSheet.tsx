import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@prime/ui';

import { fetchPlans } from '@/services/planService';
import type { AudienceType, CreateNotificationFormData } from '@/types/notifications';
import { AUDIENCE_TYPE_OPTIONS } from '@/types/notifications';
import { resolveAudienceCount } from '@/utils/notificationUtils';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { Plan } from '@/types/plans';

import { SpecificUserPickerModal } from './SpecificUserPickerModal';

type AudiencePickerSheetProps = {
  visible: boolean;
  audience: CreateNotificationFormData['audience'];
  onClose: () => void;
  onConfirm: (audience: CreateNotificationFormData['audience'], estimatedCount: number) => void;
};

export function AudiencePickerSheet({ visible, audience, onClose, onConfirm }: AudiencePickerSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['85%'], []);
  const [local, setLocal] = useState(audience);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [estimatedCount, setEstimatedCount] = useState(0);
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [officerCount, setOfficerCount] = useState(0);
  const [staffCount, setStaffCount] = useState(0);

  useEffect(() => {
    if (visible) setLocal(audience);
  }, [visible, audience]);

  useEffect(() => {
    if (!visible) return;
    void fetchPlans({ status: 'active' }).then(setPlans).catch(console.error);
    void resolveAudienceCount({ type: 'all_users' }, true).then(setTotalCustomers);
    void resolveAudienceCount({ type: 'active_users' }, true).then(setActiveCount);
    void resolveAudienceCount({ type: 'inactive_users' }, true).then(setInactiveCount);
    void resolveAudienceCount({ type: 'officers' }, true).then(setOfficerCount);
    void resolveAudienceCount({ type: 'all_staff' }, true).then(setStaffCount);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    void resolveAudienceCount(local).then(setEstimatedCount);
  }, [local, visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    [],
  );

  useEffect(() => {
    if (visible) sheetRef.current?.expand();
    else sheetRef.current?.close();
  }, [visible]);

  const subtitleFor = (type: AudienceType): string => {
    switch (type) {
      case 'all_users':
        return `Sends to all ${totalCustomers} registered users`;
      case 'active_users':
        return `${activeCount} users with active subscriptions`;
      case 'inactive_users':
        return `${inactiveCount} users without active plan`;
      case 'specific_plan':
        return local.planName
          ? `${estimatedCount} subscribers on ${local.planName}`
          : 'Select a plan below';
      case 'specific_area':
        return local.area ? `${estimatedCount} customers in ${local.area}` : 'Enter area name';
      case 'specific_users':
        return `${local.userIds?.length ?? 0} users selected`;
      case 'officers':
        return `${officerCount} field officers`;
      case 'all_staff':
        return `${staffCount} team members`;
      default:
        return '';
    }
  };

  return (
    <>
      <BottomSheet
        ref={sheetRef}
        index={visible ? 0 : -1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={onClose}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surfaceWhite }}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sheetTitle}>Select Target Audience</Text>
          {AUDIENCE_TYPE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.option, local.type === opt.value && styles.optionActive]}
              onPress={() => {
                if (opt.value === 'specific_users') {
                  setUserPickerOpen(true);
                  return;
                }
                setLocal((prev) => ({ ...prev, type: opt.value }));
              }}
            >
              <Ionicons
                name={opt.icon as keyof typeof Ionicons.glyphMap}
                size={22}
                color={local.type === opt.value ? adminColors.primary : colors.textSecondary}
              />
              <View style={styles.optionBody}>
                <Text style={styles.optionLabel}>{opt.label}</Text>
                <Text style={styles.optionSub}>{subtitleFor(opt.value)}</Text>
              </View>
              <View style={[styles.radio, local.type === opt.value && styles.radioActive]} />
            </Pressable>
          ))}

          {local.type === 'specific_plan' ? (
            <FlatList
              data={plans}
              keyExtractor={(p) => p.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.planRow, local.planId === item.id && styles.planRowActive]}
                  onPress={() =>
                    setLocal((prev) => ({
                      ...prev,
                      planId: item.id,
                      planName: item.displayName,
                    }))
                  }
                >
                  <Text style={styles.planName}>{item.displayName}</Text>
                  <Text style={styles.planSub}>{item.subscriberCount} subscribers</Text>
                </Pressable>
              )}
            />
          ) : null}

          {local.type === 'specific_area' ? (
            <TextInput
              style={styles.areaInput}
              placeholder="Enter area / city name"
              value={local.area ?? ''}
              onChangeText={(area) => setLocal((prev) => ({ ...prev, area }))}
            />
          ) : null}

          <Text style={styles.countFooter}>{estimatedCount} recipients will receive this notification</Text>
          <Button
            label="Confirm Audience"
            onPress={() => onConfirm(local, estimatedCount)}
          />
        </BottomSheetScrollView>
      </BottomSheet>

      <SpecificUserPickerModal
        visible={userPickerOpen}
        selectedIds={local.userIds ?? []}
        selectedNames={local.userNames ?? []}
        onClose={() => setUserPickerOpen(false)}
        onConfirm={(userIds, userNames) => {
          setLocal((prev) => ({ ...prev, type: 'specific_users', userIds, userNames }));
          setUserPickerOpen(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  optionActive: { borderColor: adminColors.primary, backgroundColor: adminColors.primaryTint },
  optionBody: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  optionSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderDefault,
  },
  radioActive: { borderColor: adminColors.primary, backgroundColor: adminColors.primary },
  planRow: {
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  planRowActive: { borderColor: adminColors.primary, backgroundColor: adminColors.primaryTint },
  planName: { fontWeight: '600', color: colors.textPrimary },
  planSub: { fontSize: 12, color: colors.textSecondary },
  areaInput: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceWhite,
  },
  countFooter: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: adminColors.primary,
    marginVertical: spacing.md,
  },
});
