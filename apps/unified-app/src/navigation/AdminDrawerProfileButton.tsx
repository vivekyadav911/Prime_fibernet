import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

import type { AdminDrawerParamList } from '@/types/navigation';

import { AdminHeaderButton, ADMIN_HEADER_ICON_SIZE } from './AdminHeaderButton';

export function AdminDrawerProfileButton() {
  const navigation = useNavigation<NavigationProp<AdminDrawerParamList>>();

  const handlePress = () => {
    navigation.navigate('Settings', { screen: 'AdminAccount' });
  };

  return (
    <AdminHeaderButton accessibilityLabel="Profile" onPress={handlePress}>
      <Ionicons name="person-circle-outline" size={ADMIN_HEADER_ICON_SIZE} color="#FFFFFF" />
    </AdminHeaderButton>
  );
}
