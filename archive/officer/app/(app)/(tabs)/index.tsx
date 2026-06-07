import { StyleSheet, Text } from 'react-native';
import { EmptyState, Screen, colors } from '@prime/ui';

export default function DashboardScreen() {
  return (
    <Screen>
      <Text style={styles.heading}>Today</Text>
      <EmptyState
        title="Dashboard placeholder"
        description="Assignments and attendance summary will load in M2."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
});
