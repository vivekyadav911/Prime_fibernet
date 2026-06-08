import { useEffect, useState } from 'react';

import type { RequestType } from '@prime/types';

import { getSupabase } from '@/services/supabase';
import {
  useCreateRequestMutation,
  useGetMyRequestsQuery,
  useUpdateRequestStatusMutation,
} from '@/store/api/endpoints';
import { useAppSelector } from '@/store/hooks';

export type Attachment = {
  id: string;
  uri: string;
  name: string;
};

const MAX_ATTACHMENTS = 3;
const MAX_BYTES = 5 * 1024 * 1024;

async function uploadPhotos(uris: string[]): Promise<string[]> {
  const supabase = getSupabase();
  return Promise.all(
    uris.map(async (uri) => {
      const filename = `requests/${Date.now()}-${Math.random()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error } = await supabase.storage
        .from('attachments')
        .upload(filename, blob, { contentType: 'image/jpeg' });
      if (error) throw error;
      const { data } = supabase.storage.from('attachments').getPublicUrl(filename);
      return data.publicUrl;
    }),
  );
}

export function useRequests() {
  const user = useAppSelector((s) => s.auth.user);
  const userId = user?.id ?? '';

  const { data, isLoading, error, refetch } = useGetMyRequestsQuery(userId, { skip: !userId });
  const [createRequest] = useCreateRequestMutation();
  const [updateStatus] = useUpdateRequestStatusMutation();
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    if (!userId) return;
    const client = getSupabase();
    const channel = client
      .channel(`customer-requests-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void refetch();
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [userId, refetch]);

  const addAttachment = (uri: string, name: string, sizeBytes: number) => {
    if (attachments.length >= MAX_ATTACHMENTS) {
      throw new Error(`Maximum ${MAX_ATTACHMENTS} photos allowed`);
    }
    if (sizeBytes > MAX_BYTES) {
      throw new Error('Each photo must be under 5 MB');
    }
    setAttachments((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, uri, name }]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const submitRequest = async (input: {
    requestType: RequestType;
    address: string;
    description?: string;
  }) => {
    if (!userId) throw new Error('Sign in required');
    const photoUrls = attachments.length > 0 ? await uploadPhotos(attachments.map((a) => a.uri)) : [];
    await createRequest({
      userId,
      requestType: input.requestType,
      address: input.address,
      description: input.description,
      userName: user?.name,
      userEmail: user?.email,
      photoUrls,
    }).unwrap();
    setAttachments([]);
    await refetch();
  };

  const cancelRequest = async (requestId: string) => {
    await updateStatus({ id: requestId, status: 'cancelled', note: 'Cancelled by customer' }).unwrap();
    await refetch();
  };

  return {
    user,
    requests: data ?? [],
    attachments,
    addAttachment,
    removeAttachment,
    clearAttachments: () => setAttachments([]),
    isLoading,
    error,
    refetch,
    submitRequest,
    cancelRequest,
  };
}
