import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

import { corsHeaders } from '../_shared/cors.ts';
import {
  getWhatsAppSettings,
  logWhatsApp,
  renderTemplate,
  resolveRequestUserId,
  sendWhatsAppText,
} from '../_shared/whatsapp.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENWA_API_MASTER_KEY = Deno.env.get('OPENWA_API_MASTER_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { complaint_id, new_status, update_message = '' } = await req.json();
    if (!complaint_id || !new_status) {
      throw new Error('complaint_id and new_status required');
    }

    const sentBy = await resolveRequestUserId(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      req.headers.get('Authorization'),
    );

    const settings = await getWhatsAppSettings(supabase);
    if (!settings?.enabled || !settings.notify_complaints) {
      return new Response(JSON.stringify({ skipped: true, reason: 'disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!settings.gateway_session_id) {
      return new Response(JSON.stringify({ skipped: true, reason: 'missing_session_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: complaint, error: complaintError } = await supabase
      .from('customer_complaints')
      .select('id, complaint_number, customer_id, customer_name')
      .eq('id', complaint_id)
      .single();

    if (complaintError || !complaint) {
      return new Response(JSON.stringify({ error: 'Complaint not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: customer } = complaint.customer_id
      ? await supabase
          .from('users')
          .select('phone')
          .eq('id', complaint.customer_id)
          .maybeSingle()
      : { data: null };

    if (!customer?.phone) {
      await logWhatsApp(supabase, {
        recipient_phone: 'unknown',
        recipient_name: complaint.customer_name,
        message_type: 'complaint_update',
        reference_id: complaint_id,
        reference_type: 'complaint',
        status: 'skipped',
        error_message: 'Complaint customer has no phone number',
        sent_by: sentBy,
      });

      return new Response(JSON.stringify({ skipped: true, reason: 'missing_phone' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const text = renderTemplate(settings.complaint_update_template, {
      customer_name: complaint.customer_name ?? 'Customer',
      complaint_id: complaint.complaint_number ?? complaint.id.slice(0, 8).toUpperCase(),
      status: new_status,
      message: update_message,
    });

    const result = await sendWhatsAppText(
      settings.gateway_url,
      OPENWA_API_MASTER_KEY,
      settings.gateway_session_id,
      customer.phone,
      text,
    );

    await logWhatsApp(supabase, {
      recipient_phone: customer.phone,
      recipient_name: complaint.customer_name,
      message_type: 'complaint_update',
      reference_id: complaint_id,
      reference_type: 'complaint',
      status: result.success ? 'sent' : 'failed',
      error_message: result.error ?? null,
      wa_message_id: result.messageId ?? null,
      sent_by: sentBy,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
