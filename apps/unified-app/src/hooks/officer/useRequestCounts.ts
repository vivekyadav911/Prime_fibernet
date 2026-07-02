import { useAppSelector } from '@/store/hooks';

import { useOfficerDashboardStats } from './useOfficerDashboardStats';

/** Stat tiles on the officer dashboard — same assignment source as Today's Assignments. */
export function useRequestCounts() {
  const user = useAppSelector((s) => s.auth.user);
  return useOfficerDashboardStats(user?.id);
}
