import { useMemo } from 'react';

import { useGetMyRequestsQuery } from '@/store/api/endpoints';
import { useAppSelector } from '@/store/hooks';

const UNRESOLVED_STATUSES = new Set(['pending', 'assigned', 'in_progress', 'awaiting_customer']);

export function useCustomerRequestBadge(): number {
  const userId = useAppSelector((s) => s.auth.user?.id ?? '');
  const { data: requests } = useGetMyRequestsQuery(userId, { skip: !userId });

  return useMemo(
    () => (requests ?? []).filter((r) => UNRESOLVED_STATUSES.has(r.status)).length,
    [requests],
  );
}
