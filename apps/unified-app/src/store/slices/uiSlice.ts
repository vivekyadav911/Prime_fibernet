import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export type ToastMessage = {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
};

export type ActiveModal = {
  id: string;
  props?: Record<string, unknown>;
} | null;

export type ThemeMode = 'light' | 'dark' | 'system';

type UiState = {
  toastQueue: ToastMessage[];
  activeModal: ActiveModal;
  networkStatus: 'online' | 'offline' | 'unknown';
  /** Drives the global offline banner (set by SyncManager via NetInfo) */
  offlineBannerVisible: boolean;
  theme: ThemeMode;
};

const initialState: UiState = {
  toastQueue: [],
  activeModal: null,
  networkStatus: 'unknown',
  offlineBannerVisible: false,
  theme: 'system',
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    enqueueToast(state, action: PayloadAction<ToastMessage>) {
      state.toastQueue.push(action.payload);
    },
    dequeueToast(state, action: PayloadAction<string>) {
      state.toastQueue = state.toastQueue.filter((toast) => toast.id !== action.payload);
    },
    clearToasts(state) {
      state.toastQueue = [];
    },
    setActiveModal(state, action: PayloadAction<ActiveModal>) {
      state.activeModal = action.payload;
    },
    setNetworkStatus(state, action: PayloadAction<UiState['networkStatus']>) {
      state.networkStatus = action.payload;
      state.offlineBannerVisible = action.payload === 'offline';
    },
    setOfflineBannerVisible(state, action: PayloadAction<boolean>) {
      state.offlineBannerVisible = action.payload;
    },
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
    },
  },
});

export const {
  enqueueToast,
  dequeueToast,
  clearToasts,
  setActiveModal,
  setNetworkStatus,
  setOfflineBannerVisible,
  setTheme,
} = uiSlice.actions;
