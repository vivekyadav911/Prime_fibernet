import { corsHeaders } from './cors.ts';

/** Match download max — reject oversized upload bodies. */
export const MAX_SPEEDTEST_PAYLOAD_BYTES = 26_214_400;

/** Per-IP sliding window — enough for ~2 full tests/minute. */
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export function rateLimitResponse(req: Request): Response | null {
  const ip = getClientIp(req);
  const now = Date.now();
  let bucket = rateBuckets.get(ip);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateBuckets.set(ip, bucket);
  }

  bucket.count += 1;

  if (bucket.count > MAX_REQUESTS_PER_WINDOW) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in a minute.' }), {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': '60',
      },
    });
  }

  return null;
}

export async function readBodyWithLimit(req: Request, maxBytes: number): Promise<ArrayBuffer> {
  const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10);
  if (contentLength > maxBytes) {
    throw new PayloadTooLargeError();
  }

  const body = req.body;
  if (!body) return new ArrayBuffer(0);

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      throw new PayloadTooLargeError();
    }
    chunks.push(value);
  }

  const buffer = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return buffer.buffer;
}

export class PayloadTooLargeError extends Error {
  constructor() {
    super('Payload too large');
    this.name = 'PayloadTooLargeError';
  }
}

export function payloadTooLargeResponse(): Response {
  return new Response(JSON.stringify({ error: 'Payload too large' }), {
    status: 413,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
