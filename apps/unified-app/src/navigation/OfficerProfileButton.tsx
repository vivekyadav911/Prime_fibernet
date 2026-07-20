import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';

import { officerHeaderTheme } from '@/theme/officerHeader';

import { AdminHeaderButton, ADMIN_HEADER_ICON_SIZE } from './AdminHeaderButton';
import { navigateToOfficerProfile } from './officerShellNavigation';

export function OfficerProfileButton() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  return (
    <AdminHeaderButton
      accessibilityLabel="Profile"
      onPress={() => {
        navigateToOfficerProfile(navigation);
      }}
    >
      <Ionicons
        name="person-circle-outline"
        size={ADMIN_HEADER_ICON_SIZE}
        color={officerHeaderTheme.foreground}
      />
    </AdminHeaderButton>
  );
}
