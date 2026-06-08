import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import type { NotificationPrefs, UserProfile } from '@/types/user';
import type { Subscription } from '@/types/subscription';

type UserState = {
  profile: UserProfile | null;
  subscription: Subscription | null;
  preferences: Record<string, unknown>;
  notificationPrefs: NotificationPrefs;
};

const initialState: UserState = {
  profile: null,
  subscription: null,
  preferences: {},
  notificationPrefs: {},
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setProfile(state, action: PayloadAction<UserProfile | null>) {
      state.profile = action.payload;
    },
    setSubscription(state, action: PayloadAction<Subscription | null>) {
      state.subscription = action.payload;
    },
    setPreferences(state, action: PayloadAction<Record<string, unknown>>) {
      state.preferences = action.payload;
    },
    setNotificationPrefs(state, action: PayloadAction<NotificationPrefs>) {
      state.notificationPrefs = action.payload;
    },
    clearUserState(state) {
      state.profile = null;
      state.subscription = null;
      state.preferences = {};
      state.notificationPrefs = {};
    },
  },
});

export const {
  setProfile,
  setSubscription,
  setPreferences,
  setNotificationPrefs,
  clearUserState,
} = userSlice.actions;
