import type { SupabaseClient } from '@supabase/supabase-js';

import { readUriAsArrayBuffer } from '@/utils/fileUploadBody';

const EVIDENCE_BUCKET = 'payment-evidence';
/** ponytail: 1y signed URL stored for admin review links */
const SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 365;

export type PaymentCollectionMetaInput = {
  latitude?: number;
  longitude?: number;
  photoUri?: string;
};

function storageErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = String((error as { message: unknown }).message).trim();
    if (msg) return msg;
  }
  return 'Could not upload evidence photo';
}

/** Upload field evidence and persist geo on an existing payment row. */
export async function attachPaymentCollectionMeta(
  client: SupabaseClient,
  paymentId: string,
  meta: PaymentCollectionMetaInput,
): Promise<void> {
  const patch: Record<string, number | string> = {};

  if (typeof meta.latitude === 'number' && Number.isFinite(meta.latitude)) {
    patch.collection_latitude = meta.latitude;
  }
  if (typeof meta.longitude === 'number' && Number.isFinite(meta.longitude)) {
    patch.collection_longitude = meta.longitude;
  }

  if (meta.photoUri?.trim()) {
    const storagePath = `${paymentId}/evidence.jpg`;
    try {
      const body = await readUriAsArrayBuffer(meta.photoUri);
      const { error: uploadError } = await client.storage.from(EVIDENCE_BUCKET).upload(storagePath, body, {
        upsert: true,
        contentType: 'image/jpeg',
      });
      if (uploadError) {
        throw new Error(storageErrorMessage(uploadError));
      }

      const { data: signed, error: signError } = await client.storage
        .from(EVIDENCE_BUCKET)
        .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);
      if (signError || !signed?.signedUrl) {
        throw new Error(signError ? storageErrorMessage(signError) : 'Could not create evidence link');
      }
      patch.evidence_photo_url = signed.signedUrl;
    } catch (e) {
      throw e instanceof Error ? e : new Error(storageErrorMessage(e));
    }
  }

  if (Object.keys(patch).length === 0) return;

  const { error: updateError } = await client.from('payments').update(patch).eq('id', paymentId);
  if (updateError) {
    throw new Error(updateError.message || 'Could not save collection evidence');
  }
}
