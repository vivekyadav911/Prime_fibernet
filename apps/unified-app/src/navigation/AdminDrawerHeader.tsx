import type { DrawerHeaderProps } from '@react-navigation/drawer';

import { AdminAppBar } from '@/components/admin/AdminAppBar';
import { adminHeaderTheme } from '@/theme/adminHeader';

function resolveTitle(options: DrawerHeaderProps['options'], route: DrawerHeaderProps['route']): string {
  const raw = options.title ?? route.name;
  return typeof raw === 'string' ? raw : route.name;
}

export function AdminDrawerHeader({ options, route }: DrawerHeaderProps) {
  const tintColor = options.headerTintColor ?? adminHeaderTheme.foreground;
  const title = resolveTitle(options, route);

  const headerLeft = options.headerLeft?.({
    tintColor,
    label: title,
    canGoBack: false,
  });

  const headerRight = options.headerRight?.({
    tintColor,
    canGoBack: false,
  });

  return (
    <AdminAppBar
      title={title}
      headerLeft={headerLeft}
      headerRight={headerRight}
    />
  );
}
