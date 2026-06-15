import { useGetOfficerDwellsQuery } from '@/services/api/officerTrackingApi';

export function useOfficerDwells(date: string, officerId?: string, enabled = true) {
  return useGetOfficerDwellsQuery(
    { date, officerId },
    { skip: !enabled },
  );
}
