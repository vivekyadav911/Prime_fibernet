import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { OtpVerificationScreen } from '@/screens/auth/OtpVerificationScreen';
import { SignUpScreen } from '@/screens/auth/SignUpScreen';
import type { AuthStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primaryNavy },
        headerTintColor: colors.white,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={SignUpScreen} options={{ title: 'Create account' }} />
      <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: 'Create account' }} />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: 'Reset password' }}
      />
      <Stack.Screen
        name="OTPVerification"
        component={OtpVerificationScreen}
        options={{ title: 'Verify code' }}
      />
    </Stack.Navigator>
  );
}
