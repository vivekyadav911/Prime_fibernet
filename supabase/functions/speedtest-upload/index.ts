import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import {
  MAX_SPEEDTEST_PAYLOAD_BYTES,
  PayloadTooLargeError,
  payloadTooLargeResponse,
  rateLimitResponse,
  readBodyWithLimit,
} from '../_shared/speedtestGuard.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    });
  }

  const limited = rateLimitResponse(req);
  if (limited) return limited;

  try {
    const body = await readBodyWithLimit(req, MAX_SPEEDTEST_PAYLOAD_BYTES);

    return new Response(JSON.stringify({ received_bytes: body.byteLength, ts: Date.now() }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return payloadTooLargeResponse();
    }
    return new Response(JSON.stringify({ error: 'Upload failed' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
