import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AdminMfaScreen } from '@/screens/auth/AdminMfaScreen';
import { CreatePasswordScreen } from '@/screens/auth/CreatePasswordScreen';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
import { ForgotUsernameScreen } from '@/screens/auth/ForgotUsernameScreen';
import { LandingScreen } from '@/screens/auth/LandingScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { OtpVerificationScreen } from '@/screens/auth/OtpVerificationScreen';
import type { AuthStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Landing"
      screenOptions={{
        headerStyle: { backgroundColor: colors.primaryNavy },
        headerTintColor: colors.white,
      }}
    >
      <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: 'Reset password' }}
      />
      <Stack.Screen
        name="ForgotUsername"
        component={ForgotUsernameScreen}
        options={{ title: 'Forgot username' }}
      />
      <Stack.Screen
        name="OTPVerification"
        component={OtpVerificationScreen}
        options={{ title: 'Verify code' }}
      />
      <Stack.Screen
        name="CreatePassword"
        component={CreatePasswordScreen}
        options={{ title: 'Create password', headerBackVisible: false }}
      />
      <Stack.Screen
        name="AdminMfa"
        component={AdminMfaScreen}
        options={{ title: 'Two-factor authentication', headerBackVisible: false }}
      />
    </Stack.Navigator>
  );
}
