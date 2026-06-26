const ALGO = { name: 'AES-GCM', length: 256 } as const;

function getKeyMaterial(): string {
  // No guessable literal fallback. A dedicated OFFICER_CREDENTIALS_KEY is
  // preferred; SUPABASE_SERVICE_ROLE_KEY is accepted only so any credentials
  // encrypted before a dedicated key was provisioned remain decryptable.
  const key =
    Deno.env.get('OFFICER_CREDENTIALS_KEY') ??
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!key || key.length < 32) {
    throw new Error(
      'OFFICER_CREDENTIALS_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set and at least 32 characters',
    );
  }
  return key.slice(0, 32).padEnd(32, '0');
}

async function importKey(): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(getKeyMaterial());
  return crypto.subtle.importKey('raw', raw, ALGO, false, ['encrypt', 'decrypt']);
}

export async function encryptPassword(plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importKey();
  const encoded = new TextEncoder().encode(plaintext);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptPassword(ciphertext: string): Promise<string> {
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const key = await importKey();
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(plain);
}

export function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}
