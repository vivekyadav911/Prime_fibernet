import { baseApi } from '@/services/api/baseApi';
import type { AppDispatch } from '@/store/store';

/** RTK Query tags touched by officer-facing screens. */
export const OFFICER_REFRESH_TAGS = [
  'Attendance',
  'Approvals',
  'Requests',
  'OfficerPortal',
  'Payments',
  'Shifts',
  'Leave',
  'Inventory',
  'Payslips',
  'PortalNotifications',
  'Profile',
  'Map',
  'Geofences',
  'Support',
  'EmploymentContracts',
  'CollectionAssignments',
] as const;

export function invalidateOfficerCaches(dispatch: AppDispatch): void {
  dispatch(baseApi.util.invalidateTags([...OFFICER_REFRESH_TAGS]));
}
