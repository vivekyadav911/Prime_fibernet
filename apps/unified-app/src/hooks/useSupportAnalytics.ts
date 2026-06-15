import { useState } from 'react';

import { useGetSupportAnalyticsQuery } from '@/services/api/adminSupportApi';
import type { SupportAnalyticsPeriod } from '@/types/support';

export function useSupportAnalytics(initialPeriod: SupportAnalyticsPeriod = 'week') {
  const [period, setPeriod] = useState<SupportAnalyticsPeriod>(initialPeriod);
  const { data, isLoading, isError, error, refetch } = useGetSupportAnalyticsQuery(period);

  return { data, period, setPeriod, isLoading, isError, error, refetch };
}
