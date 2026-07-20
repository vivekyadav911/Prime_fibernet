import {
  CommonActions,
  type NavigationProp,
  type NavigatorScreenParams,
  type ParamListBase,
} from '@react-navigation/native';

import type {
  OfficerCollectionsStackParamList,
  OfficerProfileStackParamList,
} from '@/types/navigation';

type OfficerShellNavigation = NavigationProp<ParamListBase>;

function findNavigatorWithRoute(
  navigation: OfficerShellNavigation,
  routeName: string,
): OfficerShellNavigation | undefined {
  let current: OfficerShellNavigation | undefined = navigation;
  while (current) {
    if (current.getState().routeNames.includes(routeName)) {
      return current;
    }
    current = current.getParent();
  }
  return undefined;
}

/** Open the Dashboard tab from any officer screen. */
export function navigateToOfficerDashboard(navigation: OfficerShellNavigation): void {
  const tabs = findNavigatorWithRoute(navigation, 'Dashboard');
  if (tabs) {
    tabs.navigate('Dashboard');
    return;
  }

  navigation.dispatch(
    CommonActions.navigate({
      name: 'OfficerTabs',
      params: { screen: 'Dashboard' },
    }),
  );
}

/** Open root Profile stack from any officer screen. */
export function navigateToOfficerProfile(
  navigation: OfficerShellNavigation,
  params?: NavigatorScreenParams<OfficerProfileStackParamList>,
): void {
  const profileNav = findNavigatorWithRoute(navigation, 'Profile');
  if (profileNav) {
    if (params) {
      profileNav.navigate('Profile', params);
    } else {
      profileNav.navigate('Profile');
    }
    return;
  }

  navigation.dispatch(
    CommonActions.navigate({
      name: 'Profile',
      params,
    }),
  );
}

/** Open the Tickets tab from any officer screen. */
export function navigateToOfficerTickets(navigation: OfficerShellNavigation): void {
  const tabs = findNavigatorWithRoute(navigation, 'Tickets');
  if (tabs) {
    tabs.navigate('Tickets');
    return;
  }

  navigation.dispatch(
    CommonActions.navigate({
      name: 'OfficerTabs',
      params: { screen: 'Tickets' },
    }),
  );
}

/** Open the Payments tab collections flow from any officer screen. */
export function navigateToOfficerPayments(
  navigation: OfficerShellNavigation,
  collectionsParams?: NavigatorScreenParams<OfficerCollectionsStackParamList>,
): void {
  const tabs = findNavigatorWithRoute(navigation, 'Payments');
  if (tabs) {
    tabs.navigate('Payments', {
      screen: 'CollectionsStack',
      params: collectionsParams,
    });
    return;
  }

  navigation.dispatch(
    CommonActions.navigate({
      name: 'OfficerTabs',
      params: {
        screen: 'Payments',
        params: {
          screen: 'CollectionsStack',
          params: collectionsParams,
        },
      },
    }),
  );
}

/** Open the Attendance tab from any officer screen. */
export function navigateToOfficerAttendance(navigation: OfficerShellNavigation): void {
  navigation.dispatch(
    CommonActions.navigate({
      name: 'OfficerTabs',
      params: { screen: 'Attendance' },
    }),
  );
}

/** Open Settings → Leave from any officer screen. */
export function navigateToOfficerSettingsLeave(navigation: OfficerShellNavigation): void {
  navigation.dispatch(
    CommonActions.navigate({
      name: 'OfficerTabs',
      params: {
        screen: 'Settings',
        params: { screen: 'LeaveStack' },
      },
    }),
  );
}

/** Open Settings → Notifications from any officer screen. */
export function navigateToOfficerSettingsNotifications(navigation: OfficerShellNavigation): void {
  navigation.dispatch(
    CommonActions.navigate({
      name: 'OfficerTabs',
      params: {
        screen: 'Settings',
        params: { screen: 'NotificationsStack' },
      },
    }),
  );
}
