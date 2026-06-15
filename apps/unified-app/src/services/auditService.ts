import type { TypedSupabaseClient } from '@/services/api/supabase';

export type AuditActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'EXPORT'
  | 'BACKUP';

type LogAuditEventArgs = {
  client: TypedSupabaseClient;
  actionType: AuditActionType;
  category: string;
  description: string;
  metadata?: Record<string, unknown>;
  actorId?: string | null;
  actorRole?: string | null;
};

export async function logAuditEvent({
  client,
  actionType,
  category,
  description,
  metadata,
  actorId,
  actorRole,
}: LogAuditEventArgs): Promise<void> {
  const {
    data: { user },
  } = await client.auth.getUser();

  await client.from('audit_logs').insert({
    actor_id: actorId ?? user?.id ?? null,
    actor_role: actorRole ?? 'admin',
    action: actionType,
    target_entity: category,
    category,
    description,
    metadata: metadata ?? null,
    new_values: metadata ?? null,
    status: 'SUCCESS',
  });
}
