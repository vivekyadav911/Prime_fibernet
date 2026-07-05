import { useEffect, useState } from 'react';

import { getSupabase } from '@/services/supabase';

type PrimaAvailability = 'checking' | 'available' | 'unavailable';

/** Lightweight edge-function probe — empty messages avoids AI calls when keys are unset. */
export function usePrimaAvailability(customerId: string | undefined): PrimaAvailability {
  const [status, setStatus] = useState<PrimaAvailability>('checking');

  useEffect(() => {
    if (!customerId) {
      setStatus('unavailable');
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const client = getSupabase();
        const { error } = await client.functions.invoke('ai-support-chat', {
          body: { customer_id: customerId, messages: [] },
        });
        if (!cancelled) setStatus(error ? 'unavailable' : 'available');
      } catch {
        if (!cancelled) setStatus('unavailable');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  return status;
}
