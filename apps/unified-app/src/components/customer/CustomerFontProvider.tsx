import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/hanken-grotesk';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';

import { signalGlass } from '@/theme/customer/signalGlass';

type CustomerFontProviderProps = {
  children: ReactNode;
};

export function CustomerFontProvider({ children }: CustomerFontProviderProps) {
  const [loaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: signalGlass.colors.bgDeep, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={signalGlass.colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}
