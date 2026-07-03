import { getSupabase } from '@/services/supabase';

const PROFILE_BUCKET = 'user-profiles';

export async function uploadProfilePhoto(customerUserId: string, uri: string): Promise<string> {
  const supabase = getSupabase();
  const response = await fetch(uri);
  const blob = await response.blob();
  const path = `${customerUserId}/avatar.jpg`;

  const { error: uploadError } = await supabase.storage.from(PROFILE_BUCKET).upload(path, blob, {
    upsert: true,
    contentType: 'image/jpeg',
  });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path);
  const cacheBust = `${data.publicUrl}?t=${Date.now()}`;
  return cacheBust;
}
