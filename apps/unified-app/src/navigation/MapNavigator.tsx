import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AdminMapScreen } from '@/screens/admin/system/MapScreen';
import { TrailReplayScreen } from '@/screens/admin/map/TrailReplayScreen';
import type { AdminMapStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<AdminMapStackParamList>();

export function MapNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MapMain" component={AdminMapScreen} />
      <Stack.Screen name="TrailReplay" component={TrailReplayScreen} />
    </Stack.Navigator>
  );
}

export { AdminMapScreen };
