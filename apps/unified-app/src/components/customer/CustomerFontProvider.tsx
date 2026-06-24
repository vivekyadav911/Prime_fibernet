import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
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
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: signalGlass.colors.bgDeep, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={signalGlass.colors.accentPrimary} />
      </View>
    );
  }

  return <>{children}</>;
}
