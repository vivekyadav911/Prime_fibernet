import { StyleSheet, Text } from 'react-native';
import { EmptyState, Screen, colors } from '@prime/ui';

export default function HomeScreen() {
  return (
    <Screen>
      <Text style={styles.heading}>Your plan</Text>
      <EmptyState
        title="No plan data yet"
        description="Connect Supabase in M1 to load your subscription."
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
