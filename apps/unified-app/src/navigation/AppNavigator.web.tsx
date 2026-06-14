import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { TotpScreen } from '@/screens/auth/TotpScreen';
import { WebUnsupportedScreen } from '@/screens/auth/WebUnsupportedScreen';
import { useAppSelector } from '@/store/hooks';
import type { RootStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';

import { AdminNavigator } from './AdminNavigator';
import { AuthNavigator } from './AuthNavigator';

const RootStack = createNativeStackNavigator<RootStackParamList>();

/** Web entry: admin-only routing without mobile navigator dependencies. */
export function AppNavigator() {
  const { isAuthenticated, isLoading, user, requires2FA } = useAppSelector((s) => s.auth);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primaryNavy} />
      </View>
    );
  }

  const showAuth = !isAuthenticated || !user;
  const showTotp = isAuthenticated && user && requires2FA;
  const showWebUnsupported = isAuthenticated && user && !requires2FA && user.role !== 'admin';
  const showAdmin = isAuthenticated && user && !requires2FA && user.role === 'admin';
  const showUnknownRole =
    isAuthenticated &&
    user &&
    !requires2FA &&
    user.role !== 'customer' &&
    user.role !== 'officer' &&
    user.role !== 'admin';

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {showAuth && <RootStack.Screen name="Auth" component={AuthNavigator} />}
      {showTotp && <RootStack.Screen name="Totp" component={TotpScreen} />}
      {showWebUnsupported && (
        <RootStack.Screen name="WebUnsupported" component={WebUnsupportedScreen} />
      )}
      {showAdmin && <RootStack.Screen name="Admin" component={AdminNavigator} />}
      {showUnknownRole && <RootStack.Screen name="Auth" component={AuthNavigator} />}
    </RootStack.Navigator>
  );
}
