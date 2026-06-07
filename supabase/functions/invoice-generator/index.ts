import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { paymentId } = await req.json();
    if (!paymentId) throw new Error('paymentId required');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: payment } = await supabase.from('user_payments').select('*').eq('id', paymentId).single();
    if (!payment) throw new Error('Payment not found');

    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(paymentId).slice(0, 8).toUpperCase()}`;
    const pdfContent = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%% Invoice ${invoiceNumber} Amount: ${payment.amount}`;

    const path = `${payment.user_id}/${paymentId}.pdf`;
    await supabase.storage.from('invoices').upload(path, new TextEncoder().encode(pdfContent), {
      contentType: 'application/pdf',
      upsert: true,
    });

    const { data: signed } = await supabase.storage.from('invoices').createSignedUrl(path, 604800);
    await supabase.from('user_payments').update({ invoice_url: signed?.signedUrl ?? path }).eq('id', paymentId);

    return new Response(JSON.stringify({ url: signed?.signedUrl, invoiceNumber }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
