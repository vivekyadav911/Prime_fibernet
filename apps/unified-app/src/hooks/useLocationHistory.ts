import { useMemo } from 'react';

import { useGetLocationHistoryBatchQuery } from '@/services/api/officerTrackingApi';
import type { LocationHistoryPoint, TimeRange } from '@/types/map';
import { thinHistoryPoints } from '@/utils/geoUtils';

export function useLocationHistory(
  officerIds: string[],
  date: string,
  timeRange: TimeRange,
  enabled = true,
) {
  const { data, isLoading, isError, error, refetch } = useGetLocationHistoryBatchQuery(
    { officerIds, date, timeRange },
    { skip: !enabled || officerIds.length === 0 },
  );

  const trailsByOfficer = useMemo(() => {
    const map = new Map<string, LocationHistoryPoint[]>();
    if (!data) return map;
    for (const [officerId, points] of Object.entries(data)) {
      map.set(officerId, thinHistoryPoints(points));
    }
    return map;
  }, [data]);

  return { trailsByOfficer, isLoading, isError, error, refetch };
}
