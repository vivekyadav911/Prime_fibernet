import { useEffect } from 'react';

import { getSupabase } from '@/services/supabase';
import { setupNotifications } from '@/services/notifications';
import { useAppDispatch } from '@/store/hooks';
import { DEV_AUTH_CREDENTIALS, type AppRole } from '@prime/types';

import { store } from '@/store/store';
import { setSession, signInDevUser, logout as logoutAction } from '@/store/slices/authSlice';

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
        if (session?.user) {
          void setupNotifications(session.user.id);
        }
      })
      .catch(() => {
        dispatch(setSession({ session: null, user: null }));
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && store.getState().auth.isDevSession) return;

      dispatch(
        setSession({
          session,
          user: session?.user ?? null,
        }),
      );
      if (session?.user) {
        void setupNotifications(session.user.id);
      }
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

export async function devQuickSignIn(dispatch: ReturnType<typeof useAppDispatch>, role: AppRole) {
  const creds = DEV_AUTH_CREDENTIALS[role];
  const { data, error } = await getSupabase().auth.signInWithPassword({
    email: creds.email,
    password: creds.password,
  });
  if (!error) return data;

  dispatch(signInDevUser(role));
}

export async function signOut(dispatch: ReturnType<typeof useAppDispatch>) {
  if (!store.getState().auth.isDevSession) {
    await getSupabase().auth.signOut();
  }
  dispatch(logoutAction());
}

export async function verifyAdminTotp(code: string, userId: string): Promise<boolean> {
  const { data, error } = await getSupabase().functions.invoke('verify-admin-totp', {
    body: { code, userId },
  });
  if (error) return false;
  return Boolean(data?.valid);
}
