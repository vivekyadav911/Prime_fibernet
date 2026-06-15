import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useNavigation } from '@react-navigation/native';

import { colors } from '@/theme/colors';

import { AdminHeaderButton, ADMIN_HEADER_ICON_SIZE } from './AdminHeaderButton';

type AdminDrawerToggleButtonProps = {
  tintColor?: string;
};

export function AdminDrawerToggleButton({
  tintColor = colors.white,
}: AdminDrawerToggleButtonProps) {
  const navigation = useNavigation();

  return (
    <AdminHeaderButton
      accessibilityLabel="Open navigation menu"
      onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
    >
      <Ionicons name="menu" size={ADMIN_HEADER_ICON_SIZE} color={tintColor} />
    </AdminHeaderButton>
  );
}
