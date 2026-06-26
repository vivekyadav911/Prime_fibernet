import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AdminMapScreen } from '@/screens/admin/system/MapScreen';
import { TrailReplayScreen } from '@/screens/admin/map/TrailReplayScreen';
import type { AdminMapStackParamList } from '@/types/navigation';

import { adminStackScreenOptions } from './adminScreenOptions';

const Stack = createNativeStackNavigator<AdminMapStackParamList>();

export function MapNavigator() {
  return (
    <Stack.Navigator screenOptions={adminStackScreenOptions}>
      <Stack.Screen name="MapMain" component={AdminMapScreen} options={{ title: 'Officer Tracking' }} />
      <Stack.Screen name="TrailReplay" component={TrailReplayScreen} options={{ title: 'Trail replay' }} />
    </Stack.Navigator>
  );
}

export { AdminMapScreen };
