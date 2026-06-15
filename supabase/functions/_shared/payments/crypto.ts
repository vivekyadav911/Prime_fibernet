const ALGO = 'AES-GCM';
const IV_LENGTH = 12;

function getEncryptionKey(): string {
  const key = Deno.env.get('GATEWAY_ENCRYPTION_KEY');
  if (!key || key.length < 32) {
    throw new Error('GATEWAY_ENCRYPTION_KEY must be at least 32 characters');
  }
  return key;
}

async function deriveKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(getEncryptionKey().slice(0, 32));
  return crypto.subtle.importKey('raw', keyMaterial, { name: ALGO }, false, ['encrypt', 'decrypt']);
}

export async function encryptCredentials(credentials: Record<string, string>): Promise<Record<string, string>> {
  const cryptoKey = await deriveKey();
  const result: Record<string, string> = {};

  for (const [field, value] of Object.entries(credentials)) {
    if (!value || value.startsWith('encrypted:')) {
      result[field] = value;
      continue;
    }
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encoded = new TextEncoder().encode(value);
    const cipher = await crypto.subtle.encrypt({ name: ALGO, iv }, cryptoKey, encoded);
    const combined = new Uint8Array(iv.length + cipher.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(cipher), iv.length);
    result[field] = `encrypted:${btoa(String.fromCharCode(...combined))}`;
  }

  return result;
}

export async function decryptCredentials(stored: Record<string, string>): Promise<Record<string, string>> {
  const cryptoKey = await deriveKey();
  const result: Record<string, string> = {};

  for (const [field, value] of Object.entries(stored)) {
    if (!value?.startsWith('encrypted:')) {
      result[field] = value;
      continue;
    }
    const raw = Uint8Array.from(atob(value.slice('encrypted:'.length)), (c) => c.charCodeAt(0));
    const iv = raw.slice(0, IV_LENGTH);
    const cipher = raw.slice(IV_LENGTH);
    const plain = await crypto.subtle.decrypt({ name: ALGO, iv }, cryptoKey, cipher);
    result[field] = new TextDecoder().decode(plain);
  }

  return result;
}

export function maskCredential(value: string | undefined): string {
  if (!value) return '';
  if (value.startsWith('encrypted:')) return '••••••••••••';
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}
