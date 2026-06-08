import { getSupabase } from '@/services/supabase';

export async function uploadProfilePhoto(userId: string, uri: string): Promise<string> {
  const supabase = getSupabase();
  const response = await fetch(uri);
  const blob = await response.blob();
  const ext = uri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('profile-photos')
    .upload(path, blob, { upsert: true, contentType: blob.type || 'image/jpeg' });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('profile-photos').getPublicUrl(path);
  return data.publicUrl;
}
