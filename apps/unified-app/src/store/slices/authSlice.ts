import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { Session, User } from '@supabase/supabase-js';

import { DEV_MOCK_USERS, type AppRole } from '@prime/types';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
};

type AuthState = {
  session: Session | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requires2FA: boolean;
  isDevSession: boolean;
  error: string | null;
};

const initialState: AuthState = {
  session: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  requires2FA: false,
  isDevSession: false,
  error: null,
};

function mapUser(user: User): AuthUser {
  const meta = user.user_metadata ?? {};
  const role = (meta.role ?? user.app_metadata?.role ?? 'customer') as AppRole;
  return {
    id: user.id,
    email: user.email ?? '',
    name: (meta.name as string) ?? user.email ?? 'User',
    role,
  };
}

export type AuthCredentialsPayload = {
  session: Session;
  user: User;
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setCredentials(state, action: PayloadAction<AuthCredentialsPayload>) {
      const { session, user } = action.payload;
      state.session = session;
      state.isDevSession = (user.email ?? '').endsWith('@prime.local');
      state.user = mapUser(user);
      state.isAuthenticated = true;
      state.requires2FA = state.user.role === 'admin' && !user.app_metadata?.totp_verified;
      state.isLoading = false;
      state.error = null;
    },
    clearCredentials(state) {
      state.session = null;
      state.user = null;
      state.isAuthenticated = false;
      state.requires2FA = false;
      state.isDevSession = false;
      state.error = null;
      state.isLoading = false;
    },
    setSession(state, action: PayloadAction<{ session: Session | null; user: User | null }>) {
      const { session, user } = action.payload;
      state.session = session;
      if (session && user) {
        state.isDevSession = (user.email ?? '').endsWith('@prime.local');
        state.user = mapUser(user);
        state.isAuthenticated = true;
        state.requires2FA = state.user.role === 'admin' && !user.app_metadata?.totp_verified;
      } else {
        state.user = null;
        state.isAuthenticated = false;
        state.requires2FA = false;
      }
      state.isLoading = false;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    setRequires2FA(state, action: PayloadAction<boolean>) {
      state.requires2FA = action.payload;
    },
    signInDevUser(state, action: PayloadAction<AppRole>) {
      const mock = DEV_MOCK_USERS[action.payload];
      state.session = null;
      state.user = mock;
      state.isAuthenticated = true;
      state.isDevSession = true;
      state.requires2FA = false;
      state.isLoading = false;
      state.error = null;
    },
    logout(state) {
      state.session = null;
      state.user = null;
      state.isAuthenticated = false;
      state.requires2FA = false;
      state.isDevSession = false;
      state.error = null;
      state.isLoading = false;
    },
  },
});

export const {
  setLoading,
  setCredentials,
  clearCredentials,
  setSession,
  setError,
  setRequires2FA,
  signInDevUser,
  logout,
} = authSlice.actions;
