import { EmptyState, Screen } from '@prime/ui';

export default function AssignmentsScreen() {
  return (
    <Screen>
      <EmptyState
        title="No assignments"
        description="Field assignments will sync from Supabase in M2."
      />
    </Screen>
  );
}
