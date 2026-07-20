import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';

import { navigateToOfficerPayments } from '@/navigation/officerShellNavigation';
import { adminColors } from '@/theme/admin';

/** Legacy route — redirects to the assigned customers collect flow. */
export function CollectPaymentScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  useEffect(() => {
    navigateToOfficerPayments(navigation, { screen: 'CollectionsList' });
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
