import SHA512 from 'crypto-js/sha512';
import SHA256 from 'crypto-js/sha256';

export function sha512Hex(input: string): string {
  return SHA512(input).toString();
}

export function sha256Hex(input: string): string {
  return SHA256(input).toString();
}
