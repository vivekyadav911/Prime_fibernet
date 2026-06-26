// AES-GCM encryption for officer PII (bank account number, IFSC).
// Mirrors _shared/payments/crypto.ts: a dedicated key is REQUIRED (no
// guessable fallback), and ciphertext carries an `encrypted:` prefix so
// encryption is idempotent and legacy plaintext can be detected for backfill.
const ALGO = 'AES-GCM';
const IV_LENGTH = 12;
const PREFIX = 'encrypted:';

function getEncryptionKey(): string {
  const key = Deno.env.get('OFFICER_PII_KEY');
  if (!key || key.length < 32) {
    throw new Error('OFFICER_PII_KEY must be set and at least 32 characters');
  }
  return key;
}

async function deriveKey(): Promise<CryptoKey> {
  const keyMaterial = new TextEncoder().encode(getEncryptionKey().slice(0, 32));
  return crypto.subtle.importKey('raw', keyMaterial, { name: ALGO }, false, ['encrypt', 'decrypt']);
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/** Encrypt a single value. Returns null/empty untouched; already-encrypted values pass through. */
export async function encryptValue(value: string | null | undefined): Promise<string | null> {
  if (value === null || value === undefined || value === '') return value ?? null;
  if (isEncrypted(value)) return value;
  const cryptoKey = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(value);
  const cipher = await crypto.subtle.encrypt({ name: ALGO, iv }, cryptoKey, encoded);
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(cipher), iv.length);
  return `${PREFIX}${btoa(String.fromCharCode(...combined))}`;
}

/** Decrypt a single value. Non-prefixed (legacy plaintext) values are returned as-is. */
export async function decryptValue(value: string | null | undefined): Promise<string | null> {
  if (value === null || value === undefined || value === '') return value ?? null;
  if (!isEncrypted(value)) return value;
  const cryptoKey = await deriveKey();
  const raw = Uint8Array.from(atob(value.slice(PREFIX.length)), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, IV_LENGTH);
  const cipher = raw.slice(IV_LENGTH);
  const plain = await crypto.subtle.decrypt({ name: ALGO, iv }, cryptoKey, cipher);
  return new TextDecoder().decode(plain);
}

/** Mask a value for display, showing only the last 4 characters of the plaintext when known. */
export function maskValue(plaintext: string | null | undefined): string {
  if (!plaintext) return '';
  if (plaintext.length <= 4) return '••••';
  return `••••${plaintext.slice(-4)}`;
}
