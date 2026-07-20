import { useCallback, useEffect, useState } from 'react';

import { getSupabase } from '@/services/supabase';

export type MfaGate = {
  loading: boolean;
  /** A verified TOTP factor exists (session can reach aal2). */
  enrolled: boolean;
  /** The current session is MFA-verified (aal2). */
  verified: boolean;
  /** Enrolled but the current session is only aal1 — needs a challenge. */
  needsChallenge: boolean;
  refresh: () => Promise<void>;
};

/**
 * Reads native Supabase MFA assurance levels. Source of truth for both the
 * voluntary-enrollment UI (Phase 2 staged) and the future aal2 navigation gate
 * (enforcement flip). No enforcement here — callers decide what to do.
 */
export function useMfaGate(): MfaGate {
  const [state, setState] = useState<Omit<MfaGate, 'refresh'>>({
    loading: true,
    enrolled: false,
    verified: false,
    needsChallenge: false,
  });

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await getSupabase().auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;
      const enrolled = data.nextLevel === 'aal2';
      const verified = data.currentLevel === 'aal2';
      setState({ loading: false, enrolled, verified, needsChallenge: enrolled && !verified });
    } catch {
      setState({ loading: false, enrolled: false, verified: false, needsChallenge: false });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}
