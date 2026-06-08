import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import type { InventoryAssignment, Shift } from '@/types/officer';
import type { ServiceRequest } from '@/types/request';

export type LiveLocation = {
  latitude: number;
  longitude: number;
  updatedAt: string;
  requestId?: string | null;
};

type OfficeState = {
  assignedRequests: ServiceRequest[];
  currentShift: Shift | null;
  inventory: InventoryAssignment[];
  liveLocation: LiveLocation | null;
};

const initialState: OfficeState = {
  assignedRequests: [],
  currentShift: null,
  inventory: [],
  liveLocation: null,
};

export const officeSlice = createSlice({
  name: 'office',
  initialState,
  reducers: {
    setAssignedRequests(state, action: PayloadAction<ServiceRequest[]>) {
      state.assignedRequests = action.payload;
    },
    setCurrentShift(state, action: PayloadAction<Shift | null>) {
      state.currentShift = action.payload;
    },
    setInventory(state, action: PayloadAction<InventoryAssignment[]>) {
      state.inventory = action.payload;
    },
    setLiveLocation(state, action: PayloadAction<LiveLocation | null>) {
      state.liveLocation = action.payload;
    },
    clearOfficeState(state) {
      state.assignedRequests = [];
      state.currentShift = null;
      state.inventory = [];
      state.liveLocation = null;
    },
  },
});

export const {
  setAssignedRequests,
  setCurrentShift,
  setInventory,
  setLiveLocation,
  clearOfficeState,
} = officeSlice.actions;
