import { useEffect } from 'react';
import type { DrawerScreenProps } from '@react-navigation/drawer';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { OfficerDrawerParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';

type Props = DrawerScreenProps<OfficerDrawerParamList, 'CollectPayment'>;

/** Legacy route — redirects to the assigned customers collect flow. */
export function CollectPaymentScreen({ navigation }: Props) {
  useEffect(() => {
    navigation.navigate('CollectionsStack', { screen: 'AssignedCustomers' });
  }, [navigation]);

  return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color={adminColors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
