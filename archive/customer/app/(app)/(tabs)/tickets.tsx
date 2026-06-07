import { EmptyState, Screen } from '@prime/ui';

export default function TicketsScreen() {
  return (
    <Screen>
      <EmptyState
        title="No tickets"
        description="Create a support ticket once ticket APIs are wired in M2."
        actionLabel="New ticket (soon)"
        onAction={() => undefined}
      />
    </Screen>
  );
}
