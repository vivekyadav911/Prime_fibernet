import { Ionicons } from '@expo/vector-icons';
import { Platform, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackHeaderBackProps } from '@react-navigation/native-stack';

import { AdminHeaderButton, ADMIN_HEADER_ICON_SIZE } from './AdminHeaderButton';
import { AdminDrawerToggleButton } from './AdminDrawerToggleButton';

export function AdminDrawerHeaderLeft({
  tintColor,
  canGoBack,
  onBackPress,
}: NativeStackHeaderBackProps & { onBackPress?: () => void }) {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isWebSidebar = Platform.OS === 'web' && width >= 1024;

  if (canGoBack) {
    return (
      <AdminHeaderButton
        accessibilityLabel="Go back"
        onPress={() => (onBackPress ? onBackPress() : navigation.goBack())}
      >
        <Ionicons name="chevron-back" size={ADMIN_HEADER_ICON_SIZE + 2} color={tintColor} />
      </AdminHeaderButton>
    );
  }

  if (isWebSidebar) {
    return null;
  }

  return <AdminDrawerToggleButton tintColor={tintColor} />;
}
