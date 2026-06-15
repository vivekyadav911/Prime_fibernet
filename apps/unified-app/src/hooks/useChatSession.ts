import { useCallback, useEffect, useState } from 'react';

import {
  fetchChatMessages,
  fetchChatSessions,
  subscribeToChatMessages,
} from '@/services/chatService';
import type { ChatMessage, ChatSession } from '@/types/support';

export function useChatSession(filters?: { status?: string; agentId?: string }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchChatSessions(filters);
      setSessions(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.agentId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const waitingCount = sessions.filter((s) => s.status === 'waiting').length;
  const activeCount = sessions.filter((s) => s.status === 'active').length;

  return { sessions, loading, error, reload, waitingCount, activeCount };
}

export function useChatMessages(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    let channel: ReturnType<typeof subscribeToChatMessages> | null = null;

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchChatMessages(sessionId);
        setMessages(data);
      } finally {
        setLoading(false);
      }
    };

    void load();

    channel = subscribeToChatMessages(sessionId, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });

    return () => {
      if (channel) {
        const client = channel;
        void client.unsubscribe();
      }
    };
  }, [sessionId]);

  return { messages, loading, setMessages };
}
