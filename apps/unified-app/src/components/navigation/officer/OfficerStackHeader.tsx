import type { NativeStackHeaderProps } from '@react-navigation/native-stack';

import { OfficerAppBar } from '@/components/navigation/officer/OfficerAppBar';
import { officerHeaderTheme } from '@/theme/officerHeader';

function resolveTitle(options: NativeStackHeaderProps['options'], route: NativeStackHeaderProps['route']): string {
  const raw = options.title ?? route.name;
  return typeof raw === 'string' ? raw : route.name;
}

export function OfficerStackHeader({ options, route, back }: NativeStackHeaderProps) {
  const tintColor = options.headerTintColor ?? officerHeaderTheme.foreground;
  const title = resolveTitle(options, route);

  const headerLeft = options.headerLeft?.({
    tintColor,
    label: title,
    canGoBack: back != null,
  });

  const headerRight = options.headerRight?.({
    tintColor,
    canGoBack: back != null,
  });

  return <OfficerAppBar title={title} headerLeft={headerLeft} headerRight={headerRight} />;
}
