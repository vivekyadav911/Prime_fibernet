import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';

// Use Web Crypto API for HMAC webhook signature verification
async function verifyEasyBuzzWebhookSignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(body);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
    const generatedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return generatedSignature.toLowerCase() === signature.toLowerCase();
  } catch (e) {
    console.error('EasyBuzz webhook signature verification error:', e);
    return false;
  }
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EASYBUZZ_SECRET_KEY = Deno.env.get('EASYBUZZ_SECRET_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get webhook signature from headers (EasyBuzz may use different header names)
    const easybuzzSignature = req.headers.get('X-EasyBuzz-Signature') || 
                               req.headers.get('X-Signature') ||
                               req.headers.get('Authorization');
    const webhookBody = await req.text();

    if (!easybuzzSignature) {
      throw new Error('Missing EasyBuzz webhook signature');
    }

    // Verify webhook signature
    const isValid = await verifyEasyBuzzWebhookSignature(webhookBody, easybuzzSignature, EASYBUZZ_SECRET_KEY);
    
    if (!isValid) {
      throw new Error('Invalid EasyBuzz webhook signature');
    }

    const event = JSON.parse(webhookBody);
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Handle EasyBuzz payment events
    // Adjust event types based on EasyBuzz's actual webhook format
    const eventType = event.event || event.status || event.type;
    const transactionId = event.transaction_id || event.transactionId || event.id;
    const orderId = event.order_id || event.orderId || event.order_ref;

    if (eventType === 'payment.success' || eventType === 'payment.completed' || 
        eventType === 'success' || event.status === 'completed') {
      // Find payment record by order_id or transaction_id
      const { data: paymentRecord, error: findError } = await supabaseClient
        .from('user_payments')
        .select('*')
        .or(`gateway_transaction_id.eq.${orderId},gateway_transaction_id.eq.${transactionId}`)
        .maybeSingle();

      if (findError || !paymentRecord) {
        console.error('Payment record not found:', findError);
        return new Response(
          JSON.stringify({ error: 'Payment record not found' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          },
        );
      }

      // Update payment status to completed
      await supabaseClient
        .from('user_payments')
        .update({
          payment_status: 'completed',
          gateway_transaction_id: transactionId || orderId,
          upi_transaction_id: transactionId,
          collection_timestamp: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentRecord.id);

      console.log(`✅ Payment completed: ${paymentRecord.id}`);
    } else if (eventType === 'payment.failed' || eventType === 'failed' || event.status === 'failed') {
      // Handle failed payment
      const { data: paymentRecord, error: findError } = await supabaseClient
        .from('user_payments')
        .select('*')
        .or(`gateway_transaction_id.eq.${orderId},gateway_transaction_id.eq.${transactionId}`)
        .maybeSingle();

      if (!findError && paymentRecord) {
        await supabaseClient
          .from('user_payments')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', paymentRecord.id);

        console.log(`❌ Payment failed: ${paymentRecord.id}`);
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});

