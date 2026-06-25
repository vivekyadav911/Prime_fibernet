import { useCallback, useEffect } from 'react';

import { useBiometrics } from '@/hooks/useBiometrics';
import { getSupabase } from '@/services/supabase';
import { useAppDispatch } from '@/store/hooks';
import { DEV_AUTH_CREDENTIALS, type AppRole } from '@prime/types';

import { setSession, logout as logoutAction } from '@/store/slices/authSlice';

export function useAuthBootstrap() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const supabase = getSupabase();

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        dispatch(
          setSession({
            session,
            user: session?.user ?? null,
          }),
        );
      })
      .catch(() => {
        dispatch(setSession({ session: null, user: null }));
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch(
        setSession({
          session,
          user: session?.user ?? null,
        }),
      );
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);
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

export async function verifyAdminTotp(code: string, userId: string): Promise<boolean> {
  const { data, error } = await getSupabase().functions.invoke('verify-admin-totp', {
    body: { code, userId },
  });
  if (error) return false;
  return Boolean(data?.valid);
}
