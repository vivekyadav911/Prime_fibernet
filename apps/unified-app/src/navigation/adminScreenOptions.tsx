import type { DrawerNavigationOptions } from '@react-navigation/drawer';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { NativeStackHeaderBackProps } from '@react-navigation/native-stack';

import { adminColors } from '@/theme/admin';
import {
  adminHeaderLeftContainerStyle,
  adminHeaderRightContainerStyle,
  adminHeaderTheme,
} from '@/theme/adminHeader';

import { AdminDrawerHeaderLeft } from './AdminDrawerHeaderLeft';
import { AdminDrawerProfileButton } from './AdminDrawerProfileButton';
import { AdminDrawerHeader } from './AdminDrawerHeader';
import { AdminStackHeader } from './AdminStackHeader';

/** Standard admin stack header — use on every admin native stack navigator. */
export const adminStackScreenOptions: NativeStackNavigationOptions = {
  header: (props) => <AdminStackHeader {...props} />,
  headerShadowVisible: false,
  headerTintColor: adminHeaderTheme.foreground,
  headerTitleStyle: {
    fontSize: adminHeaderTheme.titleFontSize,
    fontWeight: '600',
    color: adminHeaderTheme.foreground,
  },
  headerTitleAlign: 'center',
  headerLeft: (props: NativeStackHeaderBackProps) => <AdminDrawerHeaderLeft {...props} />,
  headerRight: () => <AdminDrawerProfileButton />,
  contentStyle: { backgroundColor: adminColors.canvasBg, flex: 1 },
};

/** Drawer screens that show the header directly (no nested stack). */
export const adminDrawerScreenOptions: DrawerNavigationOptions = {
  header: (props) => <AdminDrawerHeader {...props} />,
  headerShadowVisible: false,
  headerTintColor: adminHeaderTheme.foreground,
  headerTitleStyle: {
    fontSize: adminHeaderTheme.titleFontSize,
    fontWeight: '600',
    color: adminHeaderTheme.foreground,
  },
  headerTitleAlign: 'center',
  headerLeftContainerStyle: adminHeaderLeftContainerStyle,
  headerRightContainerStyle: adminHeaderRightContainerStyle,
};
