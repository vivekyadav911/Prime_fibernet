import { ActivityIndicator, View } from 'react-native';

import { useAppSelector } from '@/store/hooks';

import { AdminNavigator } from './AdminNavigator';
import { AuthNavigator } from './AuthNavigator';
import { CustomerNavigator } from './CustomerNavigator';
import { OfficerNavigator } from './OfficerNavigator';

export function AppNavigator() {
  const { isAuthenticated, isLoading, user, requires2FA } = useAppSelector((s) => s.auth);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return <AuthNavigator />;
  }

  if (requires2FA) {
    return <AuthNavigator />;
  }

  switch (user.role) {
    case 'customer':
      return <CustomerNavigator />;
    case 'officer':
      return <OfficerNavigator />;
    case 'admin':
      return <AdminNavigator />;
    default:
      return <AuthNavigator />;
  }
}
