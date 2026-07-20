import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { useBiometrics } from '@/hooks/useBiometrics';
import { getSupabase, isInvalidRefreshTokenError } from '@/services/supabase';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { AppRoleSchema, DEV_AUTH_CREDENTIALS, type AppRole } from '@prime/types';

import {
  setSession,
  setResolvedRole,
  refreshSession,
  clearCredentials,
  logout as logoutAction,
} from '@/store/slices/authSlice';

// Module-scoped resolution state shared between the bootstrap listener and the
// interactive LoginScreen flow, so the two never race to commit a role:
// - `lastResolvedUserId`: user whose role is already committed; lets a
//   background TOKEN_REFRESHED swap the session without re-gating navigation.
// - `interactiveLoginInProgress`: LoginScreen owns the role match check; the
//   bootstrap listener must not commit a role underneath it during that window.
let lastResolvedUserId: string | null = null;
let interactiveLoginInProgress = false;

/** LoginScreen brackets its sign-in + role match check with this. */
export function setInteractiveLogin(active: boolean) {
  interactiveLoginInProgress = active;
}

/** LoginScreen records the resolved user after a successful role match. */
export function markRoleResolved(userId: string | null) {
  lastResolvedUserId = userId;
}

/**
 * Resolves the authoritative role from the DB (get_my_role RPC), not the
 * spoofable/stale JWT metadata role. Returns null if the account maps to no
 * known role (admins/officers/users) or the RPC rejects.
 */
export async function fetchMyRole(): Promise<AppRole | null> {
  const { data, error } = await getSupabase().rpc('get_my_role');
  if (error) throw error;
  const parsed = AppRoleSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_ADMIN_SESSION_HOURS = 24;

/** Admin-chosen session lifetime (hours) from general_settings; defaults to 24. */
export async function fetchAdminSessionHours(): Promise<number> {
  const { data, error } = await getSupabase().rpc('get_admin_session_hours');
  if (error) return DEFAULT_ADMIN_SESSION_HOURS;
  const n = Number(data);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_ADMIN_SESSION_HOURS;
}

export type LoginState = {
  role: AppRole | null;
  passwordSet: boolean;
  lastFullLoginAt: string | null;
};

/** One-shot read of role + claim/session state for the current user. */
export async function fetchLoginState(): Promise<LoginState> {
  const { data, error } = await getSupabase().rpc('get_login_state');
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as
    | { role?: string | null; password_set?: boolean; last_full_login_at?: string | null }
    | undefined;
  const parsed = AppRoleSchema.safeParse(row?.role ?? null);
  return {
    role: parsed.success ? parsed.data : null,
    passwordSet: Boolean(row?.password_set),
    lastFullLoginAt: row?.last_full_login_at ?? null,
  };
}

/** Resolve an email/username/customer_id to the account email (anon-safe). */
export async function resolveLoginEmail(identifier: string): Promise<string | null> {
  const id = identifier.trim();
  if (id.includes('@')) return id;
  const { data, error } = await getSupabase().rpc('email_for_identifier', { p_identifier: id });
  if (error) return null;
  return typeof data === 'string' && data.length > 0 ? data : null;
}

/**
 * Commit an established session + authoritative role into the store and release
 * the interactive-login lock. Shared by every screen that finalizes a login
 * (password login, OTP claim, create-password, admin MFA).
 */
export function commitAuthenticatedSession(
  dispatch: ReturnType<typeof useAppDispatch>,
  session: Parameters<typeof setSession>[0]['session'],
  user: NonNullable<Parameters<typeof setSession>[0]['user']>,
  role: AppRole,
) {
  lastResolvedUserId = user.id;
  dispatch(setSession({ session, user }));
  dispatch(setResolvedRole(role));
  interactiveLoginInProgress = false;
}

function isWithinWindow(lastFullLoginAt: string | null, windowMs: number): boolean {
  if (!lastFullLoginAt) return false;
  const ts = new Date(lastFullLoginAt).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= windowMs;
}

export function useAuthBootstrap() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const supabase = getSupabase();
    let cancelled = false;

    async function forceReauth() {
      lastResolvedUserId = null;
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      if (!cancelled) dispatch(clearCredentials());
    }

    // Cold-start restore decision (Phase 3 + 4). Runs once per app launch.
    // - admin: silently restored only while within the admin-configured session
    //   window (default 24h) since the last full password + TOTP login; the
    //   persisted session already carries aal2, so no re-challenge is needed
    //   inside the window. Past the window, force full re-auth.
    // - customer/officer: restore only if they've claimed a password AND the
    //   last full login is within the 30-day window; otherwise re-login.
    async function restoreSession(userId: string) {
      try {
        const { role, passwordSet, lastFullLoginAt } = await fetchLoginState();
        if (cancelled) return;
        if (!role) {
          await forceReauth();
          return;
        }
        if (role === 'admin') {
          const hours = await fetchAdminSessionHours();
          if (cancelled) return;
          if (!isWithinWindow(lastFullLoginAt, hours * 60 * 60 * 1000)) {
            await forceReauth();
            return;
          }
          lastResolvedUserId = userId;
          dispatch(setResolvedRole(role));
          return;
        }
        if (!passwordSet || !isWithinWindow(lastFullLoginAt, THIRTY_DAYS_MS)) {
          await forceReauth();
          return;
        }
        lastResolvedUserId = userId;
        dispatch(setResolvedRole(role));
      } catch {
        if (!cancelled) await forceReauth();
      }
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;
        dispatch(setSession({ session, user: session?.user ?? null }));
        if (session?.user) void restoreSession(session.user.id);
      })
      .catch(async (error: unknown) => {
        if (isInvalidRefreshTokenError(error)) {
          await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
        }
        if (!cancelled) dispatch(setSession({ session: null, user: null }));
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // The cold-start session is owned by getSession() above; ignore the
      // duplicate INITIAL_SESSION so we don't double-gate or race it.
      if (event === 'INITIAL_SESSION') return;
      const user = session?.user ?? null;
      if (!user) {
        lastResolvedUserId = null;
        dispatch(setSession({ session: null, user: null }));
        return;
      }
      // A screen is running its own sign-in + role/MFA/claim flow; don't
      // commit a role underneath it.
      if (interactiveLoginInProgress) return;
      // Background refresh for the already-resolved user: swap the session
      // silently without re-gating navigation.
      if (
        (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') &&
        lastResolvedUserId === user.id
      ) {
        dispatch(refreshSession({ session, user }));
        return;
      }
      dispatch(setSession({ session, user }));
      void restoreSession(user.id);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [dispatch]);
}

// Signed-in admins are kept online for the configured window (default 24h) and
// then signed out automatically. This is the "…otherwise when session time is
// over" half of the requirement: a real timer to the absolute expiry plus a
// re-check whenever the app returns to the foreground (covers a device that was
// asleep past the scheduled fire). Explicit logout is handled separately.
export function useAdminSessionTimeout() {
  const dispatch = useAppDispatch();
  const isAdmin = useAppSelector((s) => s.auth.isAuthenticated && s.auth.user?.role === 'admin');

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function check() {
      try {
        const [{ lastFullLoginAt }, hours] = await Promise.all([
          fetchLoginState(),
          fetchAdminSessionHours(),
        ]);
        if (cancelled || !lastFullLoginAt) return;
        const expiry = new Date(lastFullLoginAt).getTime() + hours * 60 * 60 * 1000;
        const remaining = expiry - Date.now();
        if (remaining <= 0) {
          await signOut(dispatch);
          return;
        }
        if (timer) clearTimeout(timer);
        // setTimeout takes a 32-bit delay; cap and let the foreground re-check
        // reschedule for windows longer than ~24 days.
        timer = setTimeout(() => void signOut(dispatch), Math.min(remaining, 2_147_483_647));
      } catch {
        // Leave the session intact on a transient read failure.
      }
    }

    void check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, [isAdmin, dispatch]);
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(name: string, email: string, phone: string, password: string, role: string = 'customer') {
  const { data, error } = await getSupabase().auth.signUp({
    email,
    password,
    options: {
      data: { name, phone, role },
    },
  });
  if (error) throw error;
  return data;
}

export async function resetPassword(email: string) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email);
  if (error) throw error;
}

/**
 * Dev-only convenience: performs a REAL Supabase sign-in with the seeded
 * credentials for the given role. There is no fake/skipped-session fallback —
 * if the seeded account is missing or the password is wrong, this throws and
 * the caller surfaces the error. Gated to development builds at the call site.
 */
export async function devQuickSignIn(role: AppRole) {
  const creds = DEV_AUTH_CREDENTIALS[role];
  return signInWithPassword(creds.email, creds.password);
}

export async function signOut(dispatch: ReturnType<typeof useAppDispatch>) {
  lastResolvedUserId = null;
  await getSupabase().auth.signOut();
  dispatch(logoutAction());
}

export function useBiometricLogin() {
  const dispatch = useAppDispatch();
  const { isAvailable, authenticate } = useBiometrics();

  const biometricLogin = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) return false;
    const success = await authenticate('Confirm your identity to log in');
    if (!success) return false;

    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      dispatch(setSession({ session, user: session.user }));
      return true;
    }
    return false;
  }, [authenticate, dispatch, isAvailable]);

  return { biometricLogin, isAvailable };
}

