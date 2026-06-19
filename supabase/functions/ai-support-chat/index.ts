import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const PRIMA_SYSTEM = `You are Prima, a helpful support assistant for Prime Fibernet broadband in India.
You help customers with billing, plans, troubleshooting, and account questions.
Be concise, friendly, and professional. Use ₹ for amounts.
If you cannot resolve an issue, suggest raising a support ticket or speaking to a live agent.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData.user) throw new Error('Unauthorized');

    const body = await req.json();
    const { customer_id, messages, customer_context } = body as {
      customer_id: string;
      messages: Array<{ role: string; content: string }>;
      customer_context?: Record<string, unknown>;
    };

    const { data: resolvedId, error: cidErr } = await userClient.rpc('get_customer_id');
    if (cidErr || !resolvedId || resolvedId !== customer_id) {
      throw new Error('Forbidden');
    }

    const contextBlock = customer_context
      ? `\n\nCustomer context:\n${JSON.stringify(customer_context, null, 2)}`
      : '';

    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const userText = lastUser?.content ?? '';

    let reply = `Thanks for reaching out. I can help with billing, plan info, and troubleshooting. You asked: "${userText}"`;

    if (ANTHROPIC_API_KEY) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 512,
          system: PRIMA_SYSTEM + contextBlock,
          messages: messages.map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
        }),
      });
      const json = await res.json();
      reply = json.content?.[0]?.text ?? reply;
    } else if (GEMINI_API_KEY) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${PRIMA_SYSTEM}${contextBlock}\n\nUser: ${userText}` }],
              },
            ],
          }),
        },
      );
      const json = await res.json();
      reply = json.candidates?.[0]?.content?.parts?.[0]?.text ?? reply;
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
