import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';

type CustomerFontProviderProps = {
  children: ReactNode;
};

export function CustomerFontProvider({ children }: CustomerFontProviderProps) {
  const { theme } = useCustomerTheme();
  const [loaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bgDeep, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}
