import type { DrawerHeaderProps } from '@react-navigation/drawer';

import { OfficerAppBar } from '@/components/navigation/officer/OfficerAppBar';
import { officerHeaderTheme } from '@/theme/officerHeader';

function resolveTitle(options: DrawerHeaderProps['options'], route: DrawerHeaderProps['route']): string {
  const raw = options.title ?? route.name;
  return typeof raw === 'string' ? raw : route.name;
}

export function OfficerDrawerHeader({ options, route }: DrawerHeaderProps) {
  const tintColor = options.headerTintColor ?? officerHeaderTheme.foreground;
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

  return <OfficerAppBar title={title} headerLeft={headerLeft} headerRight={headerRight} />;
}
