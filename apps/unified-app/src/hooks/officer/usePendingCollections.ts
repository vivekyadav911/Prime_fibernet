import { useMemo } from 'react';

import { useOfficerId } from '@/hooks/useOfficerId';
import { useOfficerCollections } from '@/hooks/usePayments';

export function usePendingCollections() {
  const officerId = useOfficerId();
  const query = useOfficerCollections(officerId ?? '');
  const pendingCount = useMemo(() => query.data?.pending?.length ?? 0, [query.data?.pending]);
  return { ...query, pendingCount };
}
