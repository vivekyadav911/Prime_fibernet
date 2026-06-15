import { useMemo } from 'react';

import { useOfficerCollections } from '@/hooks/usePayments';

export function usePendingCollections() {
  const query = useOfficerCollections();
  const pendingCount = useMemo(() => query.data?.pending?.length ?? 0, [query.data?.pending]);
  return { ...query, pendingCount };
}
