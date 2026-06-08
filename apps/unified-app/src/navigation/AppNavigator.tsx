import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { TotpScreen } from '@/screens/auth/TotpScreen';
import { useAppSelector } from '@/store/hooks';
import type { RootStackParamList } from '@/types/navigation';
import { colors } from '@prime/ui';

import { AdminNavigator } from './AdminNavigator';
import { AuthNavigator } from './AuthNavigator';
import { CustomerNavigator } from './CustomerNavigator';
import { OfficerNavigator } from './OfficerNavigator';

const RootStack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { isAuthenticated, isLoading, user, requires2FA } = useAppSelector((s) => s.auth);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primaryNavy} />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {(!isAuthenticated || !user) && (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
      {isAuthenticated && user && requires2FA && (
        <RootStack.Screen name="Totp" component={TotpScreen} />
      )}
      {isAuthenticated && user && !requires2FA && user.role === 'customer' && (
        <RootStack.Screen name="Customer" component={CustomerNavigator} />
      )}
      {isAuthenticated && user && !requires2FA && user.role === 'officer' && (
        <RootStack.Screen name="Officer" component={OfficerNavigator} />
      )}
      {isAuthenticated && user && !requires2FA && user.role === 'admin' && (
        <RootStack.Screen name="Admin" component={AdminNavigator} />
      )}
      {isAuthenticated && user && !requires2FA && user.role !== 'customer' && user.role !== 'officer' && user.role !== 'admin' && (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
}
