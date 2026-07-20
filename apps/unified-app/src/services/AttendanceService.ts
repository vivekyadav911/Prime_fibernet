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
  Geofence,
} from '@/types/attendance';
import {
  AttendanceActionError,
  mapLocationAccuracyError,
  mapNoZoneError,
  mapOutsideZoneError,
  mapShiftAlreadyCompletedError,
  mapSupabaseError,
} from '@/utils/attendanceErrors';
import { checkGeofenceStatus } from '@/utils/geofenceUtils';

const MAX_GPS_ACCURACY_M = 100;

async function loadActiveZones(forceRefresh: boolean): Promise<Geofence[]> {
  return locationService.loadAssignedGeofences(forceRefresh);
}

async function resolveGeofenceStatus(
  coords: Coordinates,
  geofences: Geofence[],
): Promise<ReturnType<typeof checkGeofenceStatus>> {
  return checkGeofenceStatus(coords, geofences, { accuracyMeters: coords.accuracy });
}

function zoneRadius(geofence: Geofence): number {
  return geofence.geometry.shape === 'circle' ? geofence.geometry.radius : 0;
}

class AttendanceService {
  async checkIn(options?: {
    notes?: string;
    photoProof?: string;
    uiSaysInside?: boolean;
    selectedGeofenceId?: string;
  }): Promise<CheckInResult> {
    const today = await this.getTodayRecord();
    if (today?.checkInTime && !today.checkOutTime) {
      return { action: 'already_checked_in', record: today };
    }
    if (today?.checkInTime && today.checkOutTime) {
      return { action: 'shift_already_completed', record: today };
    }

    await locationService.clearGeofenceCache();
    const geofences = await loadActiveZones(true);
    if (geofences.length === 0) {
      throw mapNoZoneError();
    }

    let activeGeofences = geofences;
    if (options?.selectedGeofenceId) {
      const picked = geofences.find((g) => g.id === options.selectedGeofenceId);
      if (!picked) throw mapNoZoneError();
      activeGeofences = [picked];
    }

    let coords: Coordinates & { mocked?: boolean };
    try {
      coords = await locationService.getCurrentLocation();
    } catch (e) {
      throw mapSupabaseError(e, 'Location permission denied or GPS unavailable.');
    }

    const accuracyError = mapLocationAccuracyError(coords.accuracy, MAX_GPS_ACCURACY_M);
    if (accuracyError) throw accuracyError;

    let status = await resolveGeofenceStatus(coords, activeGeofences);

    if (!status.isInside && options?.uiSaysInside) {
      status = await resolveGeofenceStatus(coords, activeGeofences);
    }

    if (!status.isInside || !status.geofence) {
      const radius = status.geofence ? zoneRadius(status.geofence) : 0;
      throw mapOutsideZoneError(
        Number.isFinite(status.distance) ? status.distance : 0,
        radius,
        status.geofence?.name,
      );
    }

    const net = await NetInfo.fetch();
    const payload = {
      coords,
      notes: options?.notes,
      method: 'manual_inside',
      geofenceId: status.geofence.id,
      distanceFromFence: status.distance,
      locationMocked: coords.mocked,
    };

    if (!net.isConnected) {
      await SyncManager.enqueue({
        id: `checkin-${Date.now()}`,
        operation: 'attendanceCheckIn',
        endpoint: 'attendanceCheckIn',
        payload,
      });
      return { action: 'offline_queued' };
    }

    try {
      const record = await store.dispatch(attendanceApi.endpoints.checkIn.initiate(payload)).unwrap();
      store.dispatch(setTodayRecord(record));
      return { action: 'checked_in', record };
    } catch (e) {
      throw mapSupabaseError(e, 'Check-in failed — please retry.');
    }
  }

  async checkOut(options?: {
    notes?: string;
    photoProof?: string;
    uiSaysInside?: boolean;
    selectedGeofenceId?: string;
  }): Promise<CheckOutResult> {
    const today = await this.getTodayRecord();
    if (!today?.checkInTime || today.checkOutTime) {
      return { action: 'not_checked_in' };
    }

    await locationService.clearGeofenceCache();
    const geofences = await loadActiveZones(true);
    if (geofences.length === 0) {
      throw mapNoZoneError();
    }

    let activeGeofences = geofences;
    if (options?.selectedGeofenceId) {
      const picked = geofences.find((g) => g.id === options.selectedGeofenceId);
      if (picked) activeGeofences = [picked];
    }

    let coords: Coordinates & { mocked?: boolean };
    try {
      coords = await locationService.getCurrentLocation();
    } catch (e) {
      throw mapSupabaseError(e, 'Location permission denied or GPS unavailable.');
    }

    const accuracyError = mapLocationAccuracyError(coords.accuracy, MAX_GPS_ACCURACY_M);
    if (accuracyError) throw accuracyError;

    let status = await resolveGeofenceStatus(coords, activeGeofences);
    if (!status.isInside && options?.uiSaysInside) {
      status = await resolveGeofenceStatus(coords, activeGeofences);
    }

    if (!status.isInside) {
      const radius = status.geofence ? zoneRadius(status.geofence) : 0;
      throw mapOutsideZoneError(
        Number.isFinite(status.distance) ? status.distance : 0,
        radius,
        status.geofence?.name,
      );
    }

    const net = await NetInfo.fetch();
    const payload = {
      coords,
      notes: options?.notes,
      distanceFromFence: status.distance,
    };

    if (!net.isConnected) {
      await SyncManager.enqueue({
        id: `checkout-${Date.now()}`,
        operation: 'attendanceCheckOut',
        endpoint: 'attendanceCheckOut',
        payload,
      });
      return { action: 'offline_queued' };
    }

    try {
      const record = await store.dispatch(attendanceApi.endpoints.checkOut.initiate(payload)).unwrap();
      store.dispatch(setTodayRecord(record));
      return { action: 'checked_out', record };
    } catch (e) {
      throw mapSupabaseError(e, 'Check-out failed — please retry.');
    }
  }

  async requestOutOfZoneApproval(payload: {
    type: ApprovalType;
    reason: string;
    coords: Coordinates;
    photoProof?: string;
    date?: string;
    geofenceId?: string;
  }): Promise<ApprovalRequest> {
    if (
      payload.type === 'out_of_zone_checkin' ||
      payload.type === 'late_checkin' ||
      payload.type === 'second_shift_checkin'
    ) {
      const today = await this.getTodayRecord();
      if (today?.checkInTime && today.checkOutTime) {
        throw mapShiftAlreadyCompletedError();
      }
    }

    const geofences = await loadActiveZones(true);
    const scoped = payload.geofenceId
      ? geofences.filter((g) => g.id === payload.geofenceId)
      : geofences;

    const status =
      scoped.length > 0
        ? checkGeofenceStatus(payload.coords, scoped, { accuracyMeters: payload.coords.accuracy })
        : { isInside: false, geofence: null as Geofence | null, distance: 0 };

    const existing = await store
      .dispatch(attendanceApi.endpoints.getMyApprovalRequests.initiate(undefined, { forceRefetch: true }))
      .unwrap();
    const pendingSameType = (existing ?? []).find(
      (r) => r.status === 'pending' && r.type === payload.type,
    );
    if (pendingSameType) {
      const zoneChanged =
        !!payload.geofenceId &&
        !!pendingSameType.geofenceId &&
        pendingSameType.geofenceId !== payload.geofenceId;
      if (!zoneChanged) {
        store.dispatch(setPendingApproval(pendingSameType));
        throw new AttendanceActionError(
          'Waiting for approval — your request is already pending.',
          'pending_approval',
        );
      }
      await store
        .dispatch(attendanceApi.endpoints.cancelMyPendingApproval.initiate({ id: pendingSameType.id }))
        .unwrap();
    }

    const net = await NetInfo.fetch();
    const body = {
      type: payload.type,
      reason: payload.reason,
      coords: payload.coords,
      photoProof: payload.photoProof,
      date: payload.date ?? '',
      distanceFromFence: Number.isFinite(status.distance) ? status.distance : 0,
      geofenceId: status.geofence?.id ?? payload.geofenceId,
    };

    if (!net.isConnected) {
      await SyncManager.enqueue({
        id: `approval-${Date.now()}`,
        operation: 'attendanceApproval',
        endpoint: 'attendanceApproval',
        payload: body,
      });
      throw new AttendanceActionError(
        'No internet connection — approval request queued for sync.',
        'offline_queued',
      );
    }

    try {
      const request = await store
        .dispatch(attendanceApi.endpoints.requestApproval.initiate(body))
        .unwrap();
      store.dispatch(setPendingApproval(request));
      return request;
    } catch (e) {
      throw mapSupabaseError(e, 'Could not submit approval request — please retry.');
    }
  }

  async getTodayRecord(): Promise<AttendanceRecord | null> {
    try {
      const record = await store
        .dispatch(attendanceApi.endpoints.getTodayAttendance.initiate(undefined, { forceRefetch: true }))
        .unwrap();
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
