import type { NavigationProp } from '@react-navigation/native';

import type { CustomerStackParamList, CustomerTabParamList } from '@/types/navigation';

type CustomerShellNavigation = NavigationProp<
  CustomerTabParamList & CustomerStackParamList
>;

/** Open the Profile tab from any customer tab or stack screen. */
export function navigateToCustomerProfile(navigation: CustomerShellNavigation): void {
  const routeNames = navigation.getState().routeNames;
  if (routeNames.includes('Profile')) {
    navigation.navigate('Profile');
    return;
  }
  navigation.navigate('CustomerTabs', { screen: 'Profile' });
}

/** Open notifications stack screen from any customer tab or stack screen. */
export function navigateToCustomerNotifications(navigation: CustomerShellNavigation): void {
  navigation.navigate('Notifications');
}
