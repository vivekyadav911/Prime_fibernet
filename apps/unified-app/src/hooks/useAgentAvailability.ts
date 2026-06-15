import { useCallback, useState } from 'react';

import { setAgentAvailability } from '@/services/chatService';
import type { AgentAvailability } from '@/types/support';

export type AgentStatus = 'online' | 'away' | 'busy';

export function useAgentAvailability(agentUserId: string | null) {
  const [availability, setAvailability] = useState<AgentAvailability | null>(null);
  const [status, setStatus] = useState<AgentStatus>('away');
  const [loading, setLoading] = useState(false);

  const updateStatus = useCallback(
    async (next: AgentStatus) => {
      if (!agentUserId) return;
      setLoading(true);
      try {
        const result = await setAgentAvailability(agentUserId, next);
        setAvailability(result);
        setStatus(next);
      } finally {
        setLoading(false);
      }
    },
    [agentUserId],
  );

  return { availability, status, loading, updateStatus };
}
