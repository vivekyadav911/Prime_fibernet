import type { NativeStackHeaderProps } from '@react-navigation/native-stack';

import { AdminAppBar } from '@/components/admin/AdminAppBar';
import { adminHeaderTheme } from '@/theme/adminHeader';

function resolveTitle(
  options: NativeStackHeaderProps['options'],
  route: NativeStackHeaderProps['route'],
): string {
  const raw = options.headerTitle ?? options.title ?? route.name;
  if (typeof raw === 'string') return raw;
  return route.name;
}

export function AdminStackHeader({ options, route, back }: NativeStackHeaderProps) {
  const tintColor = options.headerTintColor ?? adminHeaderTheme.foreground;
  const title = resolveTitle(options, route);
  const canGoBack = Boolean(back);

  const headerLeft = options.headerLeft?.({
    canGoBack,
    tintColor,
    label: back?.title,
    href: back?.href,
  });

  const headerRight = options.headerRight?.({
    canGoBack,
    tintColor,
  });

  const headerTitle =
    typeof options.headerTitle === 'function'
      ? options.headerTitle({ children: title, tintColor })
      : null;

  if (headerTitle) {
    return (
      <AdminAppBar
        title={title}
        headerLeft={headerLeft}
        headerRight={headerRight}
      />
    );
  }

  return (
    <AdminAppBar
      title={title}
      headerLeft={headerLeft}
      headerRight={headerRight}
    />
  );
}
