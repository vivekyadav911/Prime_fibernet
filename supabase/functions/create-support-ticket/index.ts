import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const PRIORITY_MAP: Record<string, string> = {
  outage: 'Critical',
  speed_issue: 'High',
  billing: 'Medium',
  technical: 'Medium',
  plan_change: 'Medium',
  installation: 'Medium',
  other: 'Low',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData.user) throw new Error('Unauthorized');

    const body = await req.json();
    const { category, subject, description, priority, attachments = [] } = body as {
      category: string;
      subject: string;
      description: string;
      priority?: string;
      attachments?: string[];
    };

    if (!category || !subject || !description) {
      throw new Error('category, subject, and description are required');
    }

    const { data: customerId, error: cidErr } = await userClient.rpc('get_customer_id');
    if (cidErr || !customerId) throw new Error('Customer profile not found');

    const { data: customer, error: custErr } = await admin
      .from('users')
      .select('id, name, phone, email, customer_id')
      .eq('id', customerId)
      .single();
    if (custErr || !customer) throw new Error('Customer not found');

    const { data: ticketNumber, error: numErr } = await admin.rpc('generate_ticket_number');
    if (numErr) throw numErr;

    const resolvedPriority = priority ?? PRIORITY_MAP[category] ?? 'Medium';
    const now = new Date();
    const slaHours = resolvedPriority === 'Critical' ? 2 : resolvedPriority === 'High' ? 8 : 24;

    const { data: ticket, error: ticketErr } = await admin
      .from('tickets')
      .insert({
        ticket_number: ticketNumber,
        title: subject,
        contact_name: customer.name,
        contact_phone: customer.phone ?? '',
        contact_email: customer.email,
        account_number: customer.customer_id ?? `ACC-${String(customer.id).slice(0, 8)}`,
        complaint_type: category,
        priority: resolvedPriority,
        status: 'Open',
        source: 'portal',
        description,
        customer_id: customer.id,
        created_by_admin_name: customer.name,
        sla_response_deadline: new Date(now.getTime() + slaHours * 3600000).toISOString(),
        sla_resolution_deadline: new Date(now.getTime() + slaHours * 4 * 3600000).toISOString(),
      })
      .select('id, ticket_number')
      .single();
    if (ticketErr) throw ticketErr;

    if (attachments.length > 0) {
      await admin.from('ticket_customer_messages').insert({
        ticket_id: ticket.id,
        sender_type: 'customer',
        sender_id: customer.id,
        message: description,
        attachments,
      });
    }

    await admin.rpc('notify_collection_admins', {
      p_type: 'ticket',
      p_title: 'New customer ticket',
      p_body: `${customer.name} raised ${ticket.ticket_number}`,
      p_data: { ticket_id: ticket.id, customer_id: customer.id },
    });

    return new Response(
      JSON.stringify({ ticket_id: ticket.id, ticket_number: ticket.ticket_number }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
