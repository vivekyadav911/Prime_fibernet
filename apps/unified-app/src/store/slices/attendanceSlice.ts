import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import type {
  ApprovalRequest,
  AttendanceRecord,
  Coordinates,
  Geofence,
} from '@/types/attendance';

export type PermissionLevel = 'granted' | 'denied' | 'restricted' | 'undetermined';

type AttendanceState = {
  currentLocation: Coordinates | null;
  isInsideGeofence: boolean;
  activeGeofence: Geofence | null;
  distanceFromFence: number;
  todayRecord: AttendanceRecord | null;
  isCheckedIn: boolean;
  pendingApproval: ApprovalRequest | null;
  isTrackingActive: boolean;
  locationPermissionStatus: PermissionLevel;
  backgroundPermissionStatus: PermissionLevel;
  assignedGeofences: Geofence[];
  prevGeofenceStatus: { isInside: boolean; geofenceId?: string };
};

const initialState: AttendanceState = {
  currentLocation: null,
  isInsideGeofence: false,
  activeGeofence: null,
  distanceFromFence: Infinity,
  todayRecord: null,
  isCheckedIn: false,
  pendingApproval: null,
  isTrackingActive: false,
  locationPermissionStatus: 'undetermined',
  backgroundPermissionStatus: 'undetermined',
  assignedGeofences: [],
  prevGeofenceStatus: { isInside: false },
};

export const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    setCurrentLocation(state, action: PayloadAction<Coordinates | null>) {
      state.currentLocation = action.payload;
    },
    updateGeofenceStatus(
      state,
      action: PayloadAction<{ isInside: boolean; geofence: Geofence | null; distance: number }>,
    ) {
      state.isInsideGeofence = action.payload.isInside;
      state.activeGeofence = action.payload.geofence;
      state.distanceFromFence = action.payload.distance;
      state.prevGeofenceStatus = {
        isInside: action.payload.isInside,
        geofenceId: action.payload.geofence?.id,
      };
    },
    setTodayRecord(state, action: PayloadAction<AttendanceRecord | null>) {
      state.todayRecord = action.payload;
      state.isCheckedIn = Boolean(action.payload?.checkInTime && !action.payload?.checkOutTime);
    },
    setPendingApproval(state, action: PayloadAction<ApprovalRequest | null>) {
      state.pendingApproval = action.payload;
    },
    setTrackingActive(state, action: PayloadAction<boolean>) {
      state.isTrackingActive = action.payload;
    },
    setLocationPermissionStatus(state, action: PayloadAction<PermissionLevel>) {
      state.locationPermissionStatus = action.payload;
    },
    setBackgroundPermissionStatus(state, action: PayloadAction<PermissionLevel>) {
      state.backgroundPermissionStatus = action.payload;
    },
    setAssignedGeofences(state, action: PayloadAction<Geofence[]>) {
      state.assignedGeofences = action.payload;
    },
    clearAttendanceState() {
      return initialState;
    },
  },
});

export const {
  setCurrentLocation,
  updateGeofenceStatus,
  setTodayRecord,
  setPendingApproval,
  setTrackingActive,
  setLocationPermissionStatus,
  setBackgroundPermissionStatus,
  setAssignedGeofences,
  clearAttendanceState,
} = attendanceSlice.actions;
