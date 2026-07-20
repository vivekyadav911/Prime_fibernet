import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { NativeStackHeaderBackProps } from '@react-navigation/native-stack';

import { AdminHeaderButton, ADMIN_HEADER_ICON_SIZE } from './AdminHeaderButton';
import { navigateToOfficerDashboard } from './officerShellNavigation';

type OfficerStackHeaderLeftProps = NativeStackHeaderBackProps & {
  /** When false, always returns to Dashboard instead of goBack(). */
  allowGoBack?: boolean;
};

export function OfficerStackHeaderLeft({
  tintColor,
  canGoBack,
  allowGoBack = true,
}: OfficerStackHeaderLeftProps) {
  const navigation = useNavigation();

  const handlePress = () => {
    if (allowGoBack && canGoBack) {
      navigation.goBack();
      return;
    }
    navigateToOfficerDashboard(navigation as NavigationProp<ParamListBase>);
  };

  return (
    <AdminHeaderButton
      accessibilityLabel={allowGoBack && canGoBack ? 'Go back' : 'Back to dashboard'}
      onPress={handlePress}
    >
      <Ionicons name="chevron-back" size={ADMIN_HEADER_ICON_SIZE + 2} color={tintColor} />
    </AdminHeaderButton>
  );
}
