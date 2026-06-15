jest.mock('@/store/slices/attendanceSlice', () => ({
  setPendingApproval: jest.fn(),
  setTodayRecord: jest.fn(),
}));

jest.mock('@/services/LocationService', () => ({
  locationService: {
    getCurrentLocation: jest.fn(),
    loadAssignedGeofences: jest.fn(),
    clearGeofenceCache: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/store/store', () => ({
  store: {
    dispatch: jest.fn(),
  },
}));

jest.mock('@/services/api/attendanceApi', () => ({
  attendanceApi: {
    endpoints: {
      getTodayAttendance: { initiate: jest.fn() },
      checkIn: { initiate: jest.fn() },
      requestApproval: { initiate: jest.fn() },
    },
  },
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

jest.mock('@/services/offline/syncManager', () => ({
  SyncManager: { enqueue: jest.fn() },
}));

import { locationService } from '@/services/LocationService';
import { attendanceService } from '@/services/AttendanceService';
import { store } from '@/store/store';
import { attendanceApi } from '@/services/api/attendanceApi';
import type { Geofence } from '@/types/attendance';

const mockGeofence: Geofence = {
  id: 'gf-1',
  name: 'Office',
  address: '',
  city: '',
  state: '',
  isActive: true,
  geometry: { shape: 'circle', center: { latitude: 28.6139, longitude: 77.209 }, radius: 500 },
  assignedOfficers: ['off-1'],
  createdBy: '',
  createdAt: '',
  updatedAt: '',
};

describe('AttendanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns needs_approval when outside geofence', async () => {
    (locationService.getCurrentLocation as jest.Mock).mockResolvedValue({
      latitude: 28.7,
      longitude: 77.3,
    });
    (locationService.loadAssignedGeofences as jest.Mock).mockResolvedValue([mockGeofence]);
    (store.dispatch as jest.Mock).mockReturnValue({
      unwrap: jest.fn().mockResolvedValue(null),
    });

    const result = await attendanceService.checkIn();
    expect(result.action).toBe('needs_approval');
  });

  it('prevents double check-in', async () => {
    const existingRecord = {
      id: '1',
      officerId: 'off-1',
      officerName: 'Test',
      geofenceId: 'gf-1',
      geofenceName: 'Office',
      date: '2026-06-11',
      checkInTime: new Date().toISOString(),
      checkInLocation: { latitude: 28.6139, longitude: 77.209 },
      checkInMethod: 'manual_inside' as const,
      checkInDistanceFromFence: 0,
      status: 'present' as const,
      isLate: false,
      createdAt: new Date().toISOString(),
    };

    jest.spyOn(attendanceService, 'getTodayRecord').mockResolvedValue(existingRecord);

    const result = await attendanceService.checkIn();
    expect(result.action).toBe('already_checked_in');
  });

  it('calculateLiveWorkingHours returns decimal hours', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000).toISOString();
    const hours = attendanceService.calculateLiveWorkingHours(twoHoursAgo);
    expect(hours).toBeGreaterThan(1.9);
    expect(hours).toBeLessThan(2.1);
  });
});
