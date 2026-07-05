import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { rateLimitResponse } from '../_shared/speedtestGuard.ts';

const RANDOM_CHUNK_BYTES = 65_536;

function fillRandomBytes(buffer: Uint8Array): void {
  const chunk = new Uint8Array(RANDOM_CHUNK_BYTES);
  for (let offset = 0; offset < buffer.length; offset += RANDOM_CHUNK_BYTES) {
    crypto.getRandomValues(chunk);
    const len = Math.min(RANDOM_CHUNK_BYTES, buffer.length - offset);
    buffer.set(chunk.subarray(0, len), offset);
  }
}

serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'GET') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    });
  }

  const limited = rateLimitResponse(req);
  if (limited) return limited;

  const url = new URL(req.url);
  const requestedSize = parseInt(url.searchParams.get('size') ?? '5242880', 10);
  const size = Math.max(1_048_576, Math.min(requestedSize, 26_214_400));

  const buffer = new Uint8Array(size);
  fillRandomBytes(buffer);

  return new Response(buffer, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(size),
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
});
