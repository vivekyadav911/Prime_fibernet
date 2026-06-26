/// Supermemory REST client for Supabase Edge Functions (Deno).
/// Reads SUPERMEMORY_API_KEY from the environment — never hardcode keys.

const SUPERMEMORY_API_BASE = 'https://api.supermemory.ai';

export interface UserMemoryContext {
  staticProfile: string[];
  dynamicProfile: string[];
  relevantMemories: string[];
}

function getApiKey(): string | undefined {
  return Deno.env.get('SUPERMEMORY_API_KEY');
}

/** Per-user container tag — keeps each customer's memory isolated within this project. */
export function getSupermemoryContainerTag(userId: string): string {
  const sanitized = userId.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  return `prime-fibernet_user_${sanitized}`;
}

export function isSupermemoryConfigured(): boolean {
  return Boolean(getApiKey());
}

async function supermemoryFetch(path: string, body: unknown): Promise<Response> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('SUPERMEMORY_API_KEY not configured');
  }

  return fetch(`${SUPERMEMORY_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

/** Recall user profile + relevant memories before generating an LLM response. */
export async function recallUserMemory(
  userId: string,
  query: string,
  threshold = 0.6,
): Promise<UserMemoryContext | null> {
  if (!isSupermemoryConfigured()) return null;

  try {
    const res = await supermemoryFetch('/v4/profile', {
      containerTag: getSupermemoryContainerTag(userId),
      q: query,
      threshold,
    });

    if (!res.ok) {
      console.error('Supermemory profile error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const staticProfile: string[] = data.profile?.static ?? [];
    const dynamicProfile: string[] = data.profile?.dynamic ?? [];
    const relevantMemories = (data.searchResults?.results ?? [])
      .map((r: { memory?: string; chunk?: string }) => r.memory ?? r.chunk)
      .filter(Boolean);

    return { staticProfile, dynamicProfile, relevantMemories };
  } catch (err) {
    console.error('Supermemory recall failed:', err);
    return null;
  }
}

export function formatUserMemoryContext(ctx: UserMemoryContext): string {
  const parts: string[] = [];

  if (ctx.staticProfile.length) {
    parts.push(`User facts:\n${ctx.staticProfile.join('\n')}`);
  }
  if (ctx.dynamicProfile.length) {
    parts.push(`Recent context:\n${ctx.dynamicProfile.join('\n')}`);
  }
  if (ctx.relevantMemories.length) {
    parts.push(`Relevant past interactions:\n${ctx.relevantMemories.join('\n')}`);
  }

  return parts.join('\n\n');
}

/** Persist a chat turn for long-term recall on future conversations. */
export async function persistChatTurn(
  userId: string,
  userMessage: string,
  assistantMessage: string,
  metadata?: Record<string, string | number | boolean>,
): Promise<void> {
  if (!isSupermemoryConfigured()) return;

  const content = `user: ${userMessage}\nassistant: ${assistantMessage}`;

  try {
    const res = await supermemoryFetch('/v3/documents', {
      content,
      containerTag: getSupermemoryContainerTag(userId),
      metadata: {
        type: 'chat_turn',
        source: 'prime-fibernet',
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });

    if (!res.ok) {
      console.error('Supermemory persist error:', res.status, await res.text());
    }
  } catch (err) {
    console.error('Supermemory persist failed:', err);
  }
}
