import { EmptyState, Screen } from '@prime/ui';

export default function PaymentsScreen() {
  return (
    <Screen>
      <EmptyState
        title="No payments yet"
        description="Payment history will appear here after M2 integration."
      />
    </Screen>
  );
}
