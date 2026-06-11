import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { FormField, RoleGuard } from '@/components/admin';
import { useCreatePlanMutation, useGetPlansQuery, useUpdatePlanMutation } from '@/store/api/endpoints';
import type { AdminPlansStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<AdminPlansStackParamList, 'PlanForm'>;

export function PlanFormScreen({ route, navigation }: Props) {
  const planId = route.params?.planId;
  const { data: plans } = useGetPlansQuery();
  const existing = plans?.find((p) => p.id === planId);
  const [createPlan] = useCreatePlanMutation();
  const [updatePlan] = useUpdatePlanMutation();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Home');
  const [speedMbps, setSpeedMbps] = useState('50');
  const [price, setPrice] = useState('499');
  const [validityDays, setValidityDays] = useState('30');
  const [features, setFeatures] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setSpeedMbps(String(existing.speedMbps));
      setPrice(String(existing.price));
      setValidityDays(String(existing.validityDays));
      setFeatures(existing.features.join('\n'));
      setIsActive(existing.isActive);
    }
  }, [existing]);

  const onSave = async () => {
    const payload = {
      name,
      speedMbps: Number(speedMbps),
      price: Number(price),
      validityDays: Number(validityDays),
      features: features.split('\n').filter(Boolean),
      isActive,
    };
    try {
      if (planId) await updatePlan({ id: planId, ...payload }).unwrap();
      else await createPlan(payload).unwrap();
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save plan');
    }
  };

  return (
    <RoleGuard requiredPermission={planId ? 'plans.edit' : 'plans.create'}>
      <Screen>
        <FormField label="Plan Name" value={name} onChangeText={setName} />
        <FormField label="Category (Home/Business)" value={category} onChangeText={setCategory} />
        <FormField label="Speed (Mbps)" value={speedMbps} onChangeText={setSpeedMbps} keyboardType="numeric" />
        <FormField label="Price (₹)" value={price} onChangeText={setPrice} keyboardType="numeric" />
        <FormField label="Validity (days)" value={validityDays} onChangeText={setValidityDays} keyboardType="numeric" />
        <FormField label="Features (one per line)" value={features} onChangeText={setFeatures} multiline />
        <Button label={isActive ? 'Active ✓' : 'Inactive'} variant="secondary" onPress={() => setIsActive(!isActive)} />
        <Button label="Save" onPress={() => void onSave()} />
        <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
      </Screen>
    </RoleGuard>
  );
}
