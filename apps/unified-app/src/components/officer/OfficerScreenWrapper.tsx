import type { ComponentProps } from 'react';

import { ScreenWrapper } from '@/components/common';
import { useOfficerPullToRefresh } from '@/hooks/officer/useOfficerPullToRefresh';

type ScreenWrapperProps = ComponentProps<typeof ScreenWrapper>;

type OfficerScreenWrapperProps = Omit<ScreenWrapperProps, 'refreshing' | 'onRefresh'> & {
  onRefresh?: () => unknown;
};

/** Officer shell with pull-to-refresh on scrollable screens. */
export function OfficerScreenWrapper({
  onRefresh: extraRefresh,
  scrollable = true,
  ...props
}: OfficerScreenWrapperProps) {
  const { refreshing, onRefresh } = useOfficerPullToRefresh(extraRefresh);

  if (!scrollable) {
    return <ScreenWrapper {...props} scrollable={false} />;
  }

  return (
    <ScreenWrapper {...props} scrollable refreshing={refreshing} onRefresh={onRefresh} />
  );
}
