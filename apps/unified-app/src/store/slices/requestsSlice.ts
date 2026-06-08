import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import type { RequestStatus, ServiceRequest } from '@/types/request';

export type RequestUploadItem = {
  id: string;
  requestId: string;
  uri: string;
  status: 'queued' | 'uploading' | 'done' | 'failed';
};

type RequestsState = {
  requests: ServiceRequest[];
  activeRequest: ServiceRequest | null;
  uploadQueue: RequestUploadItem[];
  filters: {
    status: RequestStatus | null;
    city: string | null;
    priority: string | null;
  };
};

const initialState: RequestsState = {
  requests: [],
  activeRequest: null,
  uploadQueue: [],
  filters: {
    status: null,
    city: null,
    priority: null,
  },
};

export const requestsSlice = createSlice({
  name: 'requests',
  initialState,
  reducers: {
    setRequests(state, action: PayloadAction<ServiceRequest[]>) {
      state.requests = action.payload;
    },
    setActiveRequest(state, action: PayloadAction<ServiceRequest | null>) {
      state.activeRequest = action.payload;
    },
    enqueueUpload(state, action: PayloadAction<RequestUploadItem>) {
      state.uploadQueue.push(action.payload);
    },
    updateUploadStatus(
      state,
      action: PayloadAction<{ id: string; status: RequestUploadItem['status'] }>,
    ) {
      const item = state.uploadQueue.find((entry) => entry.id === action.payload.id);
      if (item) item.status = action.payload.status;
    },
    dequeueUpload(state, action: PayloadAction<string>) {
      state.uploadQueue = state.uploadQueue.filter((entry) => entry.id !== action.payload);
    },
    setRequestFilters(state, action: PayloadAction<Partial<RequestsState['filters']>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearRequestsState(state) {
      state.requests = [];
      state.activeRequest = null;
      state.uploadQueue = [];
      state.filters = initialState.filters;
    },
  },
});

export const {
  setRequests,
  setActiveRequest,
  enqueueUpload,
  updateUploadStatus,
  dequeueUpload,
  setRequestFilters,
  clearRequestsState,
} = requestsSlice.actions;
