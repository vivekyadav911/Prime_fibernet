import { useCallback, useState } from 'react';

import { signOut } from '@/hooks/useAuth';
import { useAppDispatch } from '@/store/hooks';

/**
 * Signs the user out via Supabase and clears the persisted auth state. On
 * completion, `isAuthenticated` flips to false and the reactive AppNavigator
 * returns to the auth stack's Landing screen automatically — no manual
 * navigation reset needed.
 *
 * ponytail: Supabase's signOut already clears its own persisted session from
 * the secure-storage adapter. A broader SecureStore wipe (and the admin
 * memory-only session policy) is Phase 3's concern.
 */
export function useLogout() {
  const dispatch = useAppDispatch();
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await signOut(dispatch);
    } finally {
      setLoggingOut(false);
    }
  }, [dispatch]);

  return { logout, loggingOut };
}
