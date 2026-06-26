import { useMemo } from 'react';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import type { CustomerTheme } from '@/theme/customer';

export function useThemedStyles<T>(factory: (theme: CustomerTheme) => T): T {
  const { theme } = useCustomerTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
