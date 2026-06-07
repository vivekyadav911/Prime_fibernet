import { EmptyState, Screen } from '@prime/ui';

export default function AttendanceScreen() {
  return (
    <Screen>
      <EmptyState
        title="Not clocked in"
        description="Clock in/out with location will be enabled in M2."
        actionLabel="Clock in (soon)"
        onAction={() => undefined}
      />
    </Screen>
  );
}
