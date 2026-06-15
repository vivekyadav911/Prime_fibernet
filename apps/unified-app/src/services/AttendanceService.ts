import NetInfo from '@react-native-community/netinfo';

import { store } from '@/store/store';
import { setPendingApproval, setTodayRecord } from '@/store/slices/attendanceSlice';
import { attendanceApi } from '@/services/api/attendanceApi';
import { locationService } from '@/services/LocationService';
import { SyncManager } from '@/services/offline/syncManager';
import type {
  ApprovalRequest,
  ApprovalType,
  AttendanceRecord,
  CheckInResult,
  CheckOutResult,
  Coordinates,
} from '@/types/attendance';
import { checkGeofenceStatus } from '@/utils/geofenceUtils';

async function resolveGeofenceStatus(
  coords: Coordinates,
  forceRefresh: boolean,
): Promise<ReturnType<typeof checkGeofenceStatus>> {
  const geofences = await locationService.loadAssignedGeofences(forceRefresh);
  return checkGeofenceStatus(coords, geofences, { accuracyMeters: coords.accuracy });
}

class AttendanceService {
  async checkIn(options?: {
    notes?: string;
    photoProof?: string;
    uiSaysInside?: boolean;
  }): Promise<CheckInResult> {
    const today = await this.getTodayRecord();
    if (today?.checkInTime && !today.checkOutTime) {
      return { action: 'already_checked_in', record: today };
    }

    await locationService.clearGeofenceCache();
    const coords = await locationService.getCurrentLocation();
    let status = await resolveGeofenceStatus(coords, true);

    if (!status.isInside && options?.uiSaysInside) {
      await locationService.clearGeofenceCache();
      status = await resolveGeofenceStatus(coords, true);
    }

    if (!status.isInside) {
      return {
        action: 'needs_approval',
        distance: status.distance,
        geofenceName: status.geofence?.name,
      };
    }

    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      await SyncManager.enqueue({
        id: `checkin-${Date.now()}`,
        operation: 'attendanceCheckIn',
        endpoint: 'attendanceCheckIn',
        payload: { coords, notes: options?.notes, method: 'manual_inside' },
      });
      return { action: 'offline_queued' };
    }

    const record = await store
      .dispatch(
        attendanceApi.endpoints.checkIn.initiate({
          coords,
          notes: options?.notes,
          method: 'manual_inside',
          geofenceId: status.geofence!.id,
          distanceFromFence: status.distance,
          locationMocked: coords.mocked,
        }),
      )
      .unwrap();

    store.dispatch(setTodayRecord(record));
    return { action: 'checked_in', record };
  }

  async checkOut(options?: {
    notes?: string;
    photoProof?: string;
    uiSaysInside?: boolean;
  }): Promise<CheckOutResult> {
    const today = await this.getTodayRecord();
    if (!today?.checkInTime || today.checkOutTime) {
      return { action: 'not_checked_in' };
    }

    await locationService.clearGeofenceCache();
    const coords = await locationService.getCurrentLocation();
    let status = await resolveGeofenceStatus(coords, true);

    if (!status.isInside && options?.uiSaysInside) {
      await locationService.clearGeofenceCache();
      status = await resolveGeofenceStatus(coords, true);
    }

    if (!status.isInside) {
      return { action: 'needs_approval', distance: status.distance };
    }

    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      await SyncManager.enqueue({
        id: `checkout-${Date.now()}`,
        operation: 'attendanceCheckOut',
        endpoint: 'attendanceCheckOut',
        payload: { coords, notes: options?.notes },
      });
      return { action: 'offline_queued' };
    }

    const record = await store
      .dispatch(
        attendanceApi.endpoints.checkOut.initiate({
          coords,
          notes: options?.notes,
          distanceFromFence: status.distance,
        }),
      )
      .unwrap();

    store.dispatch(setTodayRecord(record));
    return { action: 'checked_out', record };
  }

  async requestOutOfZoneApproval(payload: {
    type: ApprovalType;
    reason: string;
    coords: Coordinates;
    photoProof?: string;
    date: string;
  }): Promise<ApprovalRequest> {
    const geofences = await locationService.loadAssignedGeofences(true);
    const status = checkGeofenceStatus(payload.coords, geofences, {
      accuracyMeters: payload.coords.accuracy,
    });

    const request = await store
      .dispatch(
        attendanceApi.endpoints.requestApproval.initiate({
          type: payload.type,
          reason: payload.reason,
          coords: payload.coords,
          photoProof: payload.photoProof,
          date: payload.date,
          distanceFromFence: status.distance,
          geofenceId: status.geofence?.id,
        }),
      )
      .unwrap();

    store.dispatch(setPendingApproval(request));
    return request;
  }

  async getTodayRecord(): Promise<AttendanceRecord | null> {
    try {
      const record = await store.dispatch(attendanceApi.endpoints.getTodayAttendance.initiate()).unwrap();
      store.dispatch(setTodayRecord(record));
      return record;
    } catch {
      return null;
    }
  }

  async isCheckedIn(): Promise<boolean> {
    const record = await this.getTodayRecord();
    return Boolean(record?.checkInTime && !record?.checkOutTime);
  }

  calculateLiveWorkingHours(checkInTime: string): number {
    const start = new Date(checkInTime).getTime();
    const now = Date.now();
    return Math.round(((now - start) / 3_600_000) * 100) / 100;
  }
}

export const attendanceService = new AttendanceService();
