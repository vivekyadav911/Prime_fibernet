import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { Session, User } from '@supabase/supabase-js';

import { type AppRole } from '@prime/types';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
};

/**
 * Tracks resolution of the authoritative role (from the DB via get_my_role),
 * not the spoofable/stale JWT metadata role. Navigation must wait for 'ready'
 * before routing by role, otherwise a session with a stale JWT role would
 * briefly render the wrong role's navigator.
 */
export type RoleStatus = 'idle' | 'resolving' | 'ready';

type AuthState = {
  session: Session | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requires2FA: boolean;
  roleStatus: RoleStatus;
  error: string | null;
};

const initialState: AuthState = {
  session: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  requires2FA: false,
  roleStatus: 'idle',
  error: null,
};

// Role here is provisional (JWT-derived) and must not be trusted for routing
// until setResolvedRole runs with the authoritative DB role.
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

// Phase 2 (staged): the legacy app-level admin TOTP gate is retired. Native
// Supabase MFA (aal2) enforcement is deferred to the enrollment-complete flip,
// so no login-time 2FA gate is active yet. Kept as a function so the future
// AAL-based gate has a single place to live.
function computeRequires2FA(_role: AppRole, _session: Session | null): boolean {
  return false;
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
      state.user = mapUser(user);
      state.isAuthenticated = true;
      state.requires2FA = computeRequires2FA(state.user.role, session);
      state.roleStatus = 'resolving';
      state.isLoading = false;
      state.error = null;
    },
    clearCredentials(state) {
      state.session = null;
      state.user = null;
      state.isAuthenticated = false;
      state.requires2FA = false;
      state.roleStatus = 'idle';
      state.error = null;
      state.isLoading = false;
    },
    setSession(state, action: PayloadAction<{ session: Session | null; user: User | null }>) {
      const { session, user } = action.payload;
      state.session = session;
      if (session && user) {
        state.user = mapUser(user);
        state.isAuthenticated = true;
        state.requires2FA = computeRequires2FA(state.user.role, session);
        state.roleStatus = 'resolving';
      } else {
        state.user = null;
        state.isAuthenticated = false;
        state.requires2FA = false;
        state.roleStatus = 'idle';
      }
      state.isLoading = false;
    },
    // Commits the authoritative DB role and unblocks role-based navigation.
    setResolvedRole(state, action: PayloadAction<AppRole>) {
      if (!state.user) return;
      state.user.role = action.payload;
      state.requires2FA = computeRequires2FA(action.payload, state.session);
      state.roleStatus = 'ready';
    },
    // Swaps the session (e.g. TOKEN_REFRESHED) for an already-resolved user
    // without resetting roleStatus, so navigation doesn't flash the spinner.
    refreshSession(state, action: PayloadAction<{ session: Session | null; user: User | null }>) {
      const { session, user } = action.payload;
      state.session = session;
      if (session && user && state.user) {
        const existingRole = state.user.role;
        state.user = mapUser(user);
        state.user.role = existingRole;
        state.requires2FA = computeRequires2FA(existingRole, session);
      }
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    setRequires2FA(state, action: PayloadAction<boolean>) {
      state.requires2FA = action.payload;
    },
    logout(state) {
      state.session = null;
      state.user = null;
      state.isAuthenticated = false;
      state.requires2FA = false;
      state.roleStatus = 'idle';
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
  setResolvedRole,
  refreshSession,
  setError,
  setRequires2FA,
  logout,
} = authSlice.actions;
