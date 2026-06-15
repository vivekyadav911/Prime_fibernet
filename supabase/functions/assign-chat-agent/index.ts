import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { sessionId } = await req.json() as { sessionId?: string };
    if (!sessionId) throw new Error('sessionId is required');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id, agent_id, status')
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;
    if (session.agent_id) {
      return new Response(JSON.stringify({ assigned: true, agentId: session.agent_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: agents } = await supabase
      .from('agent_availability')
      .select('agent_id, active_chat_count, officers(full_name)')
      .eq('is_online', true)
      .eq('is_available', true)
      .order('active_chat_count', { ascending: true })
      .limit(1);

    const agent = agents?.[0];
    if (!agent) {
      return new Response(JSON.stringify({ assigned: false, queued: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const officerName = (agent.officers as { full_name?: string } | null)?.full_name ?? 'Agent';

    await supabase
      .from('chat_sessions')
      .update({
        agent_id: agent.agent_id,
        agent_name: officerName,
        status: 'active',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    await supabase
      .from('agent_availability')
      .update({ active_chat_count: (agent.active_chat_count as number) + 1 })
      .eq('agent_id', agent.agent_id);

    return new Response(JSON.stringify({ assigned: true, agentId: agent.agent_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
