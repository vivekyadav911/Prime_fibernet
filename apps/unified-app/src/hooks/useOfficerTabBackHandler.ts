import { useCallback } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';

import { navigateToOfficerDashboard } from '@/navigation/officerShellNavigation';

function findTabNavigator(navigation: NavigationProp<ParamListBase>): NavigationProp<ParamListBase> | undefined {
  let current: NavigationProp<ParamListBase> | undefined = navigation;
  while (current) {
    if (current.getState().routeNames.includes('Dashboard')) {
      return current;
    }
    current = current.getParent();
  }
  return undefined;
}

/** Android back: non-Dashboard tabs at stack root return to Dashboard before exiting. */
export function useOfficerTabBackHandler() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined;

      const onBack = () => {
        const tabs = findTabNavigator(navigation);
        if (!tabs) return false;

        const tabState = tabs.getState();
        const currentTab = tabState.routes[tabState.index];
        if (!currentTab) return false;

        const nestedState = currentTab.state;
        if (nestedState && nestedState.index != null && nestedState.index > 0) {
          navigation.goBack();
          return true;
        }

        if (currentTab.name !== 'Dashboard') {
          navigateToOfficerDashboard(navigation);
          return true;
        }

        return false;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [navigation]),
  );
}
