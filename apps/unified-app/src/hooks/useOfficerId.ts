import { useEffect, useState } from 'react';

import { getOfficerIdForUser } from '@/services/api/mappers';
import { getSupabase } from '@/services/supabase';
import { useAppSelector } from '@/store/hooks';

export function useOfficerId(): string | null {
  const userId = useAppSelector((s) => s.auth.user?.id ?? null);
  const [officerId, setOfficerId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setOfficerId(null);
      return;
    }

    let cancelled = false;
    void getOfficerIdForUser(getSupabase(), userId).then((id) => {
      if (!cancelled) setOfficerId(id);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return officerId;
}
