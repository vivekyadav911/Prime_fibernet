import {
  useGetDailyActivityQuery,
  useGetOfficerActivityStatsQuery,
} from '@/services/api/officerTrackingApi';
import type { ActivityStats, TimeRange } from '@/types/map';

export function useOfficerActivity(
  officerId: string | null,
  date: string,
  timeRange: TimeRange,
) {
  const skip = !officerId;

  const { data: daily, isLoading: dailyLoading } = useGetDailyActivityQuery(
    { officerId: officerId ?? '', date },
    { skip },
  );

  const {
    data: stats,
    isLoading: statsLoading,
    isError,
    error,
    refetch,
  } = useGetOfficerActivityStatsQuery(
    { officerId: officerId ?? '', date, timeRange },
    { skip },
  );

  const activity: ActivityStats | undefined = stats;

  return {
    daily,
    activity,
    isLoading: dailyLoading || statsLoading,
    isError,
    error,
    refetch,
  };
}
