import { EmptyState, Screen } from '@prime/ui';

export function AdminAuditScreen() {
  return (
    <Screen>
      <EmptyState title="Audit logs" description="Read-only filterable log viewer (ADM-008)" />
    </Screen>
  );
}
