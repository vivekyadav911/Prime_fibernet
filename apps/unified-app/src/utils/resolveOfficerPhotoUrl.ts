import { OFFICER_DOCUMENTS_BUCKET } from '@/utils/uploadOfficerDocument';
import { getSupabase } from '@/services/supabase';

/** Resolve officers.profile_photo_url (public URL, signed URL, or storage path) for display. */
export function resolveOfficerPhotoUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const { data } = getSupabase().storage.from(OFFICER_DOCUMENTS_BUCKET).getPublicUrl(trimmed);
  return data.publicUrl || null;
}
